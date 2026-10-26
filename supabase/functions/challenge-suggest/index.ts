import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("PLANWISE_ALLOWED_ORIGIN") || "*")
  .split(",")
  .map((value) => value.trim());
const corsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": allowedOrigins.includes("*")
    ? "*"
    : req.headers.get("Origin") && allowedOrigins.includes(req.headers.get("Origin")!)
      ? req.headers.get("Origin")!
      : "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
});
const iso = (d: Date) => d.toISOString().slice(0, 10);
const todaySAST = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

serve(async (req) => {
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: corsHeaders(req) });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !anon) return reply({ error: "Supabase function settings are incomplete." }, 503);
  const token = req.headers
    .get("Authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return reply({ error: "Sign in before asking for a challenge." }, 401);
  const db = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser(token);
  if (authError || !user) return reply({ error: "Your session expired. Sign in again." }, 401);
  const today = todaySAST();
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 27);
  const { data: recent, error } = await db
    .from("transactions")
    .select("category,amount")
    .eq("type", "expense")
    .gte("transaction_date", iso(start))
    .lte("transaction_date", today);
  if (error) return reply({ error: "Could not read your spending history." }, 500);
  if (!recent?.length)
    return reply(
      {
        error:
          "Record some expenses first so Wisey can suggest a challenge based on your own spending.",
      },
      400,
    );
  const totals = new Map<string, number>();
  for (const row of recent) {
    totals.set(row.category, (totals.get(row.category) || 0) + Number(row.amount));
  }
  const [category, total] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  const weeklyBaseline = Math.max(0, Math.round((total / 4) * 100) / 100);
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const { data: existing, error: existingError } = await db
    .from("savings_challenges")
    .select("id")
    .in("status", ["offered", "accepted"])
    .gte("ends_on", today)
    .limit(1);
  if (existingError) return reply({ error: "Could not check your active challenges." }, 500);
  if (existing?.length)
    return reply(
      {
        error:
          "You already have an active challenge. Complete or decline it before creating another.",
      },
      409,
    );
  const label =
    (
      {
        food: "Food",
        transport: "Transport",
        rent: "Rent",
        airtime: "Airtime and data",
        entertainment: "Entertainment",
        electricity: "Electricity",
        other: "Other",
      } as Record<string, string>
    )[category] || category;
  const { data: challenge, error: insertError } = await db
    .from("savings_challenges")
    .insert({
      user_id: user.id,
      title: `Reduce ${label.toLowerCase()} spending by 20% this week`,
      description: `Your recent ${label.toLowerCase()} spending averaged about R${weeklyBaseline.toFixed(2)} per week. Aim to keep this week's spending at or below R${(weeklyBaseline * 0.8).toFixed(2)}.`,
      category,
      baseline_amount: weeklyBaseline,
      target_reduction_percent: 20,
      starts_on: today,
      ends_on: iso(end),
      status: "offered",
      xp_awarded: 0,
    })
    .select(
      "id,title,description,category,baseline_amount,target_reduction_percent,starts_on,ends_on,status,xp_awarded",
    )
    .single();
  if (insertError)
    return reply(
      { error: "Could not save the challenge. Check the database migration and try again." },
      500,
    );
  return reply({ challenge });
});
