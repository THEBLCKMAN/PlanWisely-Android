import { createFileRoute, Link } from "@tanstack/react-router";
import { HealthScoreCard, StatCard } from "@/components/cards";
import { ComparisonBars, TrendChart } from "@/components/charts";
import { Page, PageHeader } from "@/components/nav";
import { useApp } from "@/store/app-store";
import { APP_TODAY } from "@/data/mock";
import { fmtR, monthName } from "@/lib/format";
import { pwHead } from "@/lib/head";

export const Route = createFileRoute("/_shell/analytics")({
  head: () => pwHead("Analytics — PlanWisely", "Understand your spending habits."),
  component: AnalyticsScreen,
});

function AnalyticsScreen() {
  const { transactions, totalsForMonth, healthScoreHistory } = useApp();
  const month = APP_TODAY.slice(0, 7);
  const previousMonth = shiftMonth(month, -1);
  const totals = totalsForMonth(month);
  const previousTotals = totalsForMonth(previousMonth);
  const weeklySpending = Array.from({ length: 5 }, (_, week) =>
    transactions
      .filter(
        (tx) =>
          tx.type === "expense" &&
          tx.date.startsWith(month) &&
          Math.min(4, Math.floor((Number(tx.date.slice(8, 10)) - 1) / 7)) === week,
      )
      .reduce((sum, tx) => sum + tx.amount, 0),
  );
  const delta = totals.expenses - previousTotals.expenses;
  const health = healthScoreHistory[0];

  return (
    <Page className="min-h-dvh">
      <PageHeader title="Analytics" left="menu" />

      <h2 className="text-[17px] font-extrabold text-foreground">Financial Overview</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Track and understand your spending habits
      </p>

      <div className="gradient-brand relative mb-4 overflow-hidden rounded-3xl p-5 text-navy-foreground shadow-float">
        <div className="text-[13px] font-semibold opacity-90">Total Balance</div>
        <div className="mt-1 text-[30px] font-extrabold tracking-tight">{fmtR(totals.balance)}</div>
        <div className="mt-1 text-[11px] font-semibold opacity-85">
          Current balance from the transaction list
        </div>
        <span className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-xl" />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <StatCard label="Income" amount={totals.income} direction="up" />
        <StatCard label="Expense" amount={totals.expenses} direction="down" />
        <StatCard label="Savings" amount={totals.savings} direction="up" />
      </div>

      <div className="mb-4 rounded-2xl bg-card p-4 shadow-soft">
        <h3 className="text-sm font-extrabold text-foreground">Spending Trend (This Month)</h3>
        <TrendChart data={weeklySpending} />
        <div className="flex justify-between px-2 text-[10px] font-semibold text-muted-foreground">
          <span>Week 1</span>
          <span>Week 2</span>
          <span>Week 3</span>
          <span>Week 4</span>
          <span>Week 5</span>
        </div>
      </div>

      <div className="mb-4">
        <Link to="/analytics/health">
          <HealthScoreCard
            score={health?.score ?? 0}
            grade={
              health
                ? health.score >= 90
                  ? "Excellent"
                  : health.score >= 75
                    ? "Good"
                    : health.score >= 55
                      ? "Fair"
                      : "Needs attention"
                : "Building your score"
            }
          />
        </Link>
      </div>

      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <h3 className="text-sm font-extrabold text-foreground">Monthly Comparison</h3>
        <ComparisonBars
          last={{ label: monthName(`${previousMonth}-01`), amount: previousTotals.expenses }}
          current={{ label: monthName(`${month}-01`), amount: totals.expenses }}
        />
        <p className="mt-3 text-center text-[11px] font-semibold text-muted-foreground">
          {delta <= 0
            ? `You spent ${fmtR(Math.abs(delta), { decimals: false })} less than last month.`
            : `You spent ${fmtR(delta, { decimals: false })} more than last month.`}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          to="/analytics/breakdown"
          className="rounded-2xl bg-card py-3.5 text-center text-sm font-bold text-foreground shadow-soft"
        >
          Spending Breakdown
        </Link>
        <Link
          to="/analytics/report"
          className="rounded-2xl bg-card py-3.5 text-center text-sm font-bold text-foreground shadow-soft"
        >
          Monthly Report
        </Link>
      </div>
    </Page>
  );
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
