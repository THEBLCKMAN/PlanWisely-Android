import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Json = Record<string, unknown>;
const dateISO = (d: Date) => d.toISOString().slice(0, 10);
const localParts = (now: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(now)
    .reduce((a, p) => ({ ...a, [p.type]: p.value }), {} as Record<string, string>);
const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const money = (n: number) => `R${n.toFixed(2)}`;

serve(async (req) => {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const secret = Deno.env.get("AGENT_CRON_SECRET");
  if (!secret || req.headers.get("x-agent-secret") !== secret)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key)
    return Response.json({ error: "Agent server configuration is incomplete" }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const started = await db
    .from("workflow_runs")
    .insert({ workflow: "agent-runner", status: "started" })
    .select("id")
    .single();
  let processed = 0;
  try {
    const now = new Date();
    const local = localParts(now);
    const today = `${local.year}-${local.month}-${local.day}`;
    const hour = Number(local.hour);
    const { data: profiles, error: profileError } = await db
      .from("profiles")
      .select(
        "id,created_at,budget_period_start,next_payment_date,income_pattern,spending_alerts_enabled,weekly_summary_enabled",
      );
    if (profileError) throw profileError;
    for (const profile of profiles || []) {
      processed++;
      const uid = profile.id as string;
      let start = profile.budget_period_start as string | null;
      let payday = profile.next_payment_date as string | null;
      if (start && payday && profile.income_pattern === "recurring" && payday < today) {
        const length = Math.max(1, dayDiff(start, payday));
        while (payday < today) {
          start = dateISO(new Date(Date.parse(`${payday}T00:00:00Z`) + 86400000));
          payday = dateISO(new Date(Date.parse(`${start}T00:00:00Z`) + (length - 1) * 86400000));
        }
      }
      const [txRes, budgetRes, upRes, goalRes, activityRes, streakRes] = await Promise.all([
        db
          .from("transactions")
          .select("type,amount,category,transaction_date,created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(500),
        db.from("budgets").select("category,monthly_limit,month_start").eq("user_id", uid),
        db
          .from("upcoming_expenses")
          .select("id,title,amount,due_date,category,status")
          .eq("user_id", uid)
          .eq("status", "planned"),
        db
          .from("savings_goals")
          .select("id,name,target_date,target_amount,saved_amount")
          .eq("user_id", uid)
          .not("target_date", "is", null),
        db
          .from("user_activity")
          .select("activity_date")
          .eq("user_id", uid)
          .gte("activity_date", today),
        db
          .from("login_streaks")
          .select("current_streak,last_active_date")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);
      const error =
        txRes.error ||
        budgetRes.error ||
        upRes.error ||
        goalRes.error ||
        activityRes.error ||
        streakRes.error;
      if (error) throw error;
      const tx = txRes.data || [];
      const exp = tx
        .filter(
          (x) =>
            x.type === "expense" &&
            (!start || x.transaction_date >= start) &&
            x.transaction_date <= today,
        )
        .reduce((a, x) => a + Number(x.amount), 0);
      const budgetRows = budgetRes.data || [];
      const latestByCategory = new Map<
        string,
        { month_start: string; monthly_limit: number | string }
      >();
      for (const row of budgetRows) {
        if (start && row.month_start > start) continue;
        const old = latestByCategory.get(row.category);
        if (!old || row.month_start > old.month_start) latestByCategory.set(row.category, row);
      }
      const budget = [...latestByCategory.values()].reduce(
        (a, x) => a + Number(x.monthly_limit),
        0,
      );
      const percent = budget > 0 ? (exp / budget) * 100 : 0;
      const remaining = budget - exp;
      const upcoming = (upRes.data || [])
        .filter((x) => !payday || payday < today || x.due_date <= payday)
        .reduce((a, x) => a + Number(x.amount), 0);
      const safe = remaining - upcoming;
      const daysLeft = payday ? Math.max(1, dayDiff(today, payday)) : 0;
      const daysPassed = start ? Math.max(1, dayDiff(start, today) + 1) : 1;
      const avg = exp / daysPassed;
      const notify = async (item: Json) => {
        const category = String(item.category);
        if (
          ["budget", "upcoming", "pace", "quiet", "goal", "streak", "challenge"].includes(
            category,
          ) &&
          profile.spending_alerts_enabled === false
        )
          return;
        if (
          ["weekly_summary", "tip"].includes(category) &&
          profile.weekly_summary_enabled === false
        )
          return;
        const result = await db
          .from("notifications")
          .upsert(
            { user_id: uid, ...item },
            { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
          );
        if (result.error) throw result.error;
      };
      if (budget > 0 && percent >= 70) {
        await notify({
          category: "budget",
          title: "Budget check-in",
          body: `You have used ${Math.floor(percent)}% of your budget. ${daysLeft ? `${daysLeft} days until your next payment.` : "Update your next payment date to plan the rest of this cycle."} About ${money(daysLeft ? safe / daysLeft : safe)} a day is safe to spend after upcoming costs.`,
          rule: "This alert starts when spending reaches 70% of the current payment-cycle budget.",
          details: {
            budget,
            spent: exp,
            percent_used: percent,
            remaining,
            upcoming,
            safe_to_spend: safe,
            days_until_payment: daysLeft,
          },
          action_path: "/budget",
          dedupe_key: `budget70:${start || today}`,
        });
      }
      if (budget > 0 && percent >= 90) {
        await notify({
          category: "budget",
          title: "Your budget needs attention",
          body: `You have used ${Math.floor(percent)}% of this cycle's budget. ${money(Math.max(0, safe))} remains after planned expenses. Consider pausing one flexible cost until your next payment.`,
          rule: "This urgent alert starts when spending reaches 90% of the current payment-cycle budget.",
          details: {
            budget,
            spent: exp,
            percent_used: percent,
            remaining,
            upcoming,
            safe_to_spend: safe,
          },
          action_path: "/budget",
          dedupe_key: `budget90:${start || today}`,
        });
      }
      if (safe <= 0 && upcoming > 0) {
        await notify({
          category: "upcoming",
          title: "Upcoming costs exceed what is left",
          body: `Planned expenses total ${money(upcoming)} and leave you ${money(Math.abs(safe))} short before your next payment. Review a flexible expense or update your plan.`,
          rule: "Safe to spend is the remaining budget minus planned expenses due before the next payment.",
          details: { remaining, upcoming, safe_to_spend: safe },
          action_path: "/upcoming",
          dedupe_key: `upcoming_short:${today}`,
        });
      }
      if (payday && daysLeft > 0 && avg > 0 && safe / avg < daysLeft) {
        await notify({
          category: "pace",
          title: "Your spending pace is high",
          body: `At your average pace of ${money(avg)} a day, available money may last about ${Math.max(0, safe / avg).toFixed(1)} days. Your next payment is in ${daysLeft} days.`,
          rule: "A pace alert appears when safe-to-spend divided by average daily spending is less than the days until your next payment.",
          details: {
            safe_to_spend: safe,
            average_daily_spend: avg,
            days_money_lasts: safe / avg,
            days_until_payment: daysLeft,
          },
          action_path: "/dashboard",
          dedupe_key: `pace:${start || today}`,
        });
      }
      const activityReference = tx[0]?.created_at || profile.created_at;
      const lastTx = activityReference ? Date.parse(activityReference) : 0;
      if (lastTx && now.getTime() - lastTx >= 72 * 3600000) {
        await notify({
          category: "quiet",
          title: "Keep your spending record up to date",
          body: "It has been 72 hours since your last recorded transaction or account start. Add recent spending so your budget stays accurate.",
          rule: "This reminder is sent after 72 hours without a recorded transaction; new accounts use the account creation time as the starting point.",
          details: {
            last_transaction_at: tx[0]?.created_at || null,
            account_created_at: profile.created_at,
          },
          action_path: "/transactions",
          dedupe_key: `quiet:${today}`,
        });
      }
      for (const goal of goalRes.data || []) {
        const due = dayDiff(today, goal.target_date);
        if (due === 7 || due === 1) {
          await notify({
            category: "goal",
            title:
              due === 7
                ? "Your savings goal is one week away"
                : "Your savings goal is due tomorrow",
            body: `“${goal.name}” has ${money(Number(goal.target_amount) - Number(goal.saved_amount))} left to reach its target.`,
            rule: `Goal reminders are sent 7 days and 24 hours before the deadline.`,
            details: {
              target: goal.target_amount,
              saved: goal.saved_amount,
              due_date: goal.target_date,
            },
            action_path: "/goals",
            dedupe_key: `goal:${goal.id}:${due}`,
          });
        }
      }
      const streak = streakRes.data;
      if (
        hour === 12 &&
        Number(streak?.current_streak || 0) > 0 &&
        (activityRes.data || []).length === 0
      ) {
        await notify({
          category: "streak",
          title: "Keep your streak going",
          body: "You have 12 hours left in the day to log a meaningful money action and keep your streak alive.",
          rule: "A reminder is sent at 12:00 SAST if a streak is active and there has been no activity today.",
          details: { current_streak: streak?.current_streak },
          action_path: "/dashboard",
          dedupe_key: `streak_risk:${today}`,
        });
      }
      if (
        local.hour === "09" &&
        local.minute === "00" &&
        new Date(`${today}T00:00:00Z`).getUTCDay() === 0
      ) {
        const weeklyStart = new Date(`${today}T00:00:00Z`);
        weeklyStart.setUTCDate(weeklyStart.getUTCDate() - 6);
        const weekly = tx.filter(
          (x) =>
            x.type === "expense" &&
            x.transaction_date >= dateISO(weeklyStart) &&
            x.transaction_date <= today,
        );
        const total = weekly.reduce((a, x) => a + Number(x.amount), 0);
        const cats = new Map<string, number>();
        for (const x of weekly)
          cats.set(x.category, (cats.get(x.category) || 0) + Number(x.amount));
        const top = [...cats.entries()].sort((a, b) => b[1] - a[1])[0];
        await notify({
          category: "weekly_summary",
          title: "Your weekly money summary",
          body: `You recorded ${money(total)} in expenses this week${top ? `, with ${money(top[1])} in ${top[0]}` : ""}. ${money(safe)} is safe to spend before your next payment.`,
          rule: "Weekly summaries are generated every Sunday at 09:00 SAST using the previous seven days of recorded expenses.",
          details: {
            expense_total: total,
            transactions: weekly.length,
            top_category: top?.[0] || null,
            safe_to_spend: safe,
          },
          action_path: "/analytics/report",
          dedupe_key: `weekly_summary:${today}`,
        });
        const focusCategory = top?.[0] === "entertainment" ? "saving" : "budgeting";
        let { data: tip } = await db
          .from("educational_content")
          .select("id,title,body,category")
          .eq("published", true)
          .eq("kind", "tip")
          .eq("category", focusCategory)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!tip) {
          const fallback = await db
            .from("educational_content")
            .select("id,title,body,category")
            .eq("published", true)
            .eq("kind", "tip")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (fallback.error) throw fallback.error;
          tip = fallback.data;
        }
        if (tip)
          await notify({
            category: "tip",
            title: `Weekly tip for your ${top?.[0] || "budget"}`,
            body: String(tip.body).slice(0, 800),
            rule: "A published educational tip is matched to your highest recorded spending category where possible.",
            details: {
              content_id: tip.id,
              spending_category: top?.[0] || null,
              content_category: tip.category,
            },
            action_path: "/tips",
            dedupe_key: `weekly_tip:${today}`,
          });
      }
      if (
        local.hour === "09" &&
        local.minute === "00" &&
        new Date(`${today}T00:00:00Z`).getUTCDay() === 1
      ) {
        const week = new Date(`${today}T00:00:00Z`);
        week.setUTCDate(week.getUTCDate() - ((week.getUTCDay() + 6) % 7));
        const weekStart = dateISO(week);
        const activeDays = await db
          .from("user_activity")
          .select("activity_date", { count: "exact", head: true })
          .eq("user_id", uid)
          .gte("activity_date", weekStart)
          .lte("activity_date", today);
        if (activeDays.error) throw activeDays.error;
        const totalBudget = budget;
        const bp =
          totalBudget <= 0
            ? 0
            : Math.max(
                0,
                Math.min(
                  30,
                  Math.round(30 * Math.max(0, 1 - Math.max(0, (exp - totalBudget) / totalBudget))),
                ),
              );
        const { data: goals } = await db
          .from("savings_goals")
          .select("target_amount,saved_amount")
          .eq("user_id", uid);
        if (goals === null) throw new Error("Could not load goals for score");
        const goalTarget = goals.reduce((a, g) => a + Number(g.target_amount), 0);
        const goalSaved = goals.reduce((a, g) => a + Number(g.saved_amount), 0);
        const sp = goalTarget
          ? Math.min(25, Math.round(25 * Math.min(1, goalSaved / goalTarget)))
          : 0;
        const days = activeDays.count || 0;
        const scoreWeekStart = dateISO(new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 86400000));
        const weekExpenses = tx.filter(
          (x) =>
            x.type === "expense" &&
            x.transaction_date >= scoreWeekStart &&
            x.transaction_date <= today,
        );
        const daily = new Map<string, number>();
        for (const item of weekExpenses)
          daily.set(
            item.transaction_date,
            (daily.get(item.transaction_date) || 0) + Number(item.amount),
          );
        const dailyValues = [...daily.values()];
        const avgDaily = dailyValues.length
          ? dailyValues.reduce((a, x) => a + x, 0) / dailyValues.length
          : 0;
        const variance = dailyValues.length
          ? dailyValues.reduce((a, x) => a + (x - avgDaily) ** 2, 0) / dailyValues.length
          : 0;
        const sdDaily = Math.sqrt(variance);
        const cp =
          avgDaily === 0
            ? 0
            : Math.min(25, Math.round(25 * Math.max(0, Math.min(1, 1 - sdDaily / avgDaily))));
        const ep = Math.min(20, Math.round(20 * Math.min(1, days / 7)));
        const explanation = {
          period_start: start,
          cycle_spent: exp,
          cycle_budget: totalBudget,
          savings: goalSaved,
          savings_target: goalTarget,
          active_days: days,
          spending_days: dailyValues.length,
          daily_spending_variation: sdDaily,
        };
        const { error: scoreError } = await db.from("health_score_history").upsert(
          {
            user_id: uid,
            week_start: weekStart,
            score: bp + sp + cp + ep,
            budget_adherence: bp,
            savings_progress: sp,
            spending_consistency: cp,
            app_engagement: ep,
            explanation,
          },
          { onConflict: "user_id,week_start" },
        );
        if (scoreError) throw scoreError;
      }
      // Mark accepted challenges completed only when the measured category total is within target.
      const { error: expiryError } = await db
        .from("savings_challenges")
        .update({ status: "expired" })
        .eq("user_id", uid)
        .in("status", ["offered", "accepted"])
        .lt("ends_on", today);
      if (expiryError) throw expiryError;
      const { data: activeChallenges, error: challengeError } = await db
        .from("savings_challenges")
        .select("id,category,baseline_amount,target_reduction_percent,starts_on,ends_on")
        .eq("user_id", uid)
        .eq("status", "accepted");
      if (challengeError) throw challengeError;
      for (const c of activeChallenges || []) {
        if (c.ends_on !== today) continue;
        const { data: weekTx, error: weekError } = await db
          .from("transactions")
          .select("amount")
          .eq("user_id", uid)
          .eq("type", "expense")
          .eq("category", c.category)
          .gte("transaction_date", c.starts_on)
          .lte("transaction_date", c.ends_on);
        if (weekError) throw weekError;
        const challengeSpent = (weekTx || []).reduce((a, x) => a + Number(x.amount), 0);
        if (
          challengeSpent <=
          Number(c.baseline_amount) * (1 - Number(c.target_reduction_percent) / 100)
        ) {
          const { data: completed, error: completeError } = await db
            .from("savings_challenges")
            .update({ status: "completed", xp_awarded: 100, completed_at: now.toISOString() })
            .eq("id", c.id)
            .eq("status", "accepted")
            .select("id");
          if (completeError) throw completeError;
          if (completed?.length) {
            const { data: reward, error: rewardError } = await db
              .from("user_rewards")
              .select("xp_total")
              .eq("user_id", uid)
              .maybeSingle();
            if (rewardError) throw rewardError;
            const { error: xpError } = await db.from("user_rewards").upsert({
              user_id: uid,
              xp_total: Number(reward?.xp_total || 0) + 100,
              updated_at: now.toISOString(),
            });
            if (xpError) throw xpError;
            await db.from("notifications").upsert(
              {
                user_id: uid,
                category: "challenge",
                title: "Savings challenge completed",
                body: "You reached your spending goal. 100 XP has been added to your progress.",
                rule: "Challenge completion was checked against your recorded expenses on the end date.",
                details: { spent: challengeSpent },
                action_path: "/challenges",
                dedupe_key: `challenge_complete:${c.id}`,
              },
              { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
            );
          }
        }
      }
    }
    if (started.data?.id)
      await db
        .from("workflow_runs")
        .update({
          status: "succeeded",
          processed_count: processed,
          finished_at: new Date().toISOString(),
        })
        .eq("id", started.data.id);
    return Response.json({ ok: true, processed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown workflow error";
    if (started.data?.id)
      await db
        .from("workflow_runs")
        .update({
          status: "failed",
          processed_count: processed,
          error_message: message.slice(0, 1000),
          finished_at: new Date().toISOString(),
        })
        .eq("id", started.data.id);
    return Response.json({ error: "Agent workflow failed", details: message }, { status: 500 });
  }
});
