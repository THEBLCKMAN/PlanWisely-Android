import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ScoreRing } from "@/components/cards";
import { Page, PageHeader } from "@/components/nav";
import { ProgressBar } from "@/components/ui";
import { pwHead } from "@/lib/head";
import { useApp } from "@/store/app-store";

export const Route = createFileRoute("/_shell/analytics/health")({
  head: () =>
    pwHead("Financial health — PlanWisely", "Your weekly financial health score and trend."),
  component: HealthScreen,
});
const factors = [
  {
    key: "budgetAdherence" as const,
    name: "Budget adherence",
    max: 30,
    note: "Points compare your current-cycle spending with the budget limits you set.",
  },
  {
    key: "savingsProgress" as const,
    name: "Savings progress",
    max: 25,
    note: "Points reflect saved amounts compared with your savings-goal targets.",
  },
  {
    key: "spendingConsistency" as const,
    name: "Spending consistency",
    max: 25,
    note: "Points reflect how steady your recorded daily spending is across the latest seven days.",
  },
  {
    key: "appEngagement" as const,
    name: "App engagement",
    max: 20,
    note: "Points reflect meaningful days in the app during the current week.",
  },
];
function HealthScreen() {
  const { healthScoreHistory } = useApp();
  const current = healthScoreHistory[0];
  const suggestions = [
    {
      key: "budgetAdherence" as const,
      limit: 24,
      text: "Review your payday cycle and category limits so your plan matches your next payment.",
      to: "/budget",
    },
    {
      key: "savingsProgress" as const,
      limit: 18,
      text: "Create a savings goal or record a comfortable contribution after covering essentials.",
      to: "/goals",
    },
    {
      key: "spendingConsistency" as const,
      limit: 18,
      text: "Log expenses as they happen and review a few days together to keep your spending record current.",
      to: "/transactions",
    },
    {
      key: "appEngagement" as const,
      limit: 14,
      text: "Check your budget and upcoming costs during the week to keep your plan up to date.",
      to: "/dashboard",
    },
  ].filter((item) => current && (current[item.key] ?? 0) < item.limit);
  return (
    <Page className="min-h-dvh">
      <PageHeader title="Financial Health" backTo="/dashboard" />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="gradient-brand relative mb-5 flex flex-col items-center overflow-hidden rounded-3xl p-6 text-center text-navy-foreground shadow-float"
      >
        <div className="text-xs font-semibold uppercase tracking-wide opacity-75">Weekly score</div>
        <div className="mt-3">
          <ScoreRing score={current?.score ?? 0} size={130} stroke={11} />
        </div>
        <div className="mt-3 text-3xl font-extrabold tracking-tight">
          {current
            ? current.score >= 90
              ? "Excellent"
              : current.score >= 75
                ? "Good"
                : current.score >= 55
                  ? "Fair"
                  : "Needs attention"
            : "Building your score"}
        </div>
        <p className="mt-1 max-w-[260px] text-xs opacity-85">
          Calculated from your records and saved by PlanWisely. This is an educational measure, not
          a credit score.
        </p>
        <span className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-xl" />
      </motion.div>
      {!current ? (
        <p className="mb-4 rounded-2xl bg-card p-4 text-sm text-muted-foreground">
          Your first server-calculated score will appear after the weekly Wisey score workflow runs.
          Record transactions and set budgets to build your score.
        </p>
      ) : (
        <p className="mb-4 text-center text-xs text-muted-foreground">
          Week starting {new Date(`${current.weekStart}T00:00:00`).toLocaleDateString("en-ZA")}
        </p>
      )}
      <h2 className="mb-3 text-[15px] font-extrabold text-foreground">Score breakdown</h2>
      <div className="space-y-3">
        {factors.map((f) => {
          const points = current?.[f.key] ?? 0;
          return (
            <div key={f.key} className="rounded-2xl bg-card p-4 shadow-soft">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-foreground">{f.name}</span>
                <span className="text-sm font-extrabold text-primary">
                  {points} / {f.max}
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar value={(points / f.max) * 100} />
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">{f.note}</div>
            </div>
          );
        })}
      </div>
      {current && (
        <section className="mt-6">
          <h2 className="mb-3 text-[15px] font-extrabold text-foreground">Ideas to improve</h2>
          {suggestions.length ? (
            <div className="space-y-2">
              {suggestions.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  className="block rounded-2xl bg-card p-4 text-sm text-foreground shadow-soft"
                >
                  <span className="font-bold">
                    {factors.find((factor) => factor.key === item.key)?.name}:{" "}
                  </span>
                  {item.text}
                  <span className="mt-2 block text-xs font-bold text-primary">
                    Open this section →
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-success/10 p-4 text-sm text-success">
              You are doing well across the score areas. Keep following your current plan.
            </p>
          )}
        </section>
      )}
      <section className="mt-6">
        <h2 className="mb-3 text-[15px] font-extrabold">Score history</h2>
        {healthScoreHistory.length < 2 ? (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground">
            Your weekly trend will appear after more than one weekly calculation.
          </p>
        ) : (
          <div className="space-y-2">
            {healthScoreHistory.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-card p-3">
                <span className="text-sm">
                  Week of {new Date(`${s.weekStart}T00:00:00`).toLocaleDateString("en-ZA")}
                </span>
                <strong className="text-primary">{s.score} / 100</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
