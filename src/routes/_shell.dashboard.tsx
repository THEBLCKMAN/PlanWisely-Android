import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import {
  BalanceCard,
  HealthScoreCard,
  InsightBanner,
  TransactionRow,
  WiseyShortcut,
} from "@/components/cards";
import { Page, PageHeader } from "@/components/nav";
import { useApp } from "@/store/app-store";
import { APP_TODAY } from "@/data/mock";
import { pwHead } from "@/lib/head";
import { calculateSafeToSpend, getBudgetPeriod } from "@/lib/budget-period";
import { fmtR } from "@/lib/format";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () =>
    pwHead("Dashboard — PlanWisely", "Your balance, spending and financial health at a glance."),
  component: Dashboard,
});

function Dashboard() {
  const {
    transactions,
    totalsForPeriod,
    openingBalance,
    upcomingExpenses,
    user,
    currentStreak,
    healthScoreHistory,
    categories,
  } = useApp();
  const month = APP_TODAY.slice(0, 7);
  const cycle = getBudgetPeriod(
    APP_TODAY,
    user.budgetPeriodStart,
    user.nextPaymentDate,
    user.incomePattern,
  );
  const periodStart = cycle.start || user.budgetPeriodStart || `${month}-01`;
  const totals = totalsForPeriod(periodStart, APP_TODAY);
  const recent = transactions.slice(0, 4);
  const health = healthScoreHistory[0];
  const thisWeek = weekExpenses(transactions, shiftDate(APP_TODAY, -6), APP_TODAY);
  const lastWeek = weekExpenses(transactions, shiftDate(APP_TODAY, -13), shiftDate(APP_TODAY, -7));
  const insight =
    lastWeek > 0
      ? `Spending is ${thisWeek <= lastWeek ? "down" : "up"} ${Math.round((Math.abs(thisWeek - lastWeek) / lastWeek) * 100)}% compared with the previous 7 days.`
      : "Log transactions regularly to see a weekly spending comparison here.";
  const cyclePlan = calculateSafeToSpend({
    budget: categories.reduce((sum, c) => sum + c.budget, 0),
    transactions,
    upcomingExpenses,
    periodStart: user.budgetPeriodStart,
    nextPaymentDate: user.nextPaymentDate,
    incomePattern: user.incomePattern,
    today: APP_TODAY,
  });

  return (
    <Page className="min-h-dvh">
      <PageHeader
        title="Dashboard"
        left="menu"
        right={
          <Link
            to="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-[13px] font-bold text-navy-foreground shadow-soft"
            aria-label="Profile"
          >
            <span aria-hidden="true">👤</span>
          </Link>
        }
      />

      <div className="space-y-4">
        <BalanceCard balance={totals.balance} income={totals.income} expenses={totals.expenses} />
        <section className="rounded-3xl bg-card p-5 shadow-soft" aria-label="Payday budget summary">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Safe to spend
              </p>
              <p className="mt-1 text-3xl font-extrabold text-foreground">
                {cycle.configured ? fmtR(cyclePlan.safeToSpend) : "Set up"}
              </p>
            </div>
            <div className="rounded-xl bg-primary/10 px-3 py-2 text-right">
              <p className="text-[10px] font-semibold text-muted-foreground">Next payment</p>
              <p className="text-sm font-extrabold text-primary">
                {cycle.configured ? `${cycle.daysUntilPayment} days` : "Add date"}
              </p>
            </div>
          </div>
          {cycle.configured ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <p className="rounded-xl bg-muted/60 p-3 text-muted-foreground">
                Spent{" "}
                <strong className="block text-sm text-foreground">{fmtR(cyclePlan.spent)}</strong>
              </p>
              <p className="rounded-xl bg-muted/60 p-3 text-muted-foreground">
                Upcoming{" "}
                <strong className="block text-sm text-foreground">
                  {fmtR(cyclePlan.upcoming)}
                </strong>
              </p>
              <p className="rounded-xl bg-muted/60 p-3 text-muted-foreground">
                Daily guide{" "}
                <strong className="block text-sm text-foreground">
                  {fmtR(cyclePlan.dailyAllowance)}
                </strong>
              </p>
              <p className="rounded-xl bg-muted/60 p-3 text-muted-foreground">
                At current pace{" "}
                <strong className="block text-sm text-foreground">
                  {cyclePlan.daysMoneyLasts.toFixed(1)} days
                </strong>
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Set your payment dates to see money left after planned expenses.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Link
              to="/payment-cycle"
              className="flex-1 rounded-xl bg-navy px-3 py-2 text-center text-xs font-bold text-navy-foreground"
            >
              Payment dates
            </Link>
            <Link
              to="/upcoming"
              className="flex-1 rounded-xl border border-border px-3 py-2 text-center text-xs font-bold text-foreground"
            >
              Upcoming costs
            </Link>
          </div>
        </section>
        <Link
          to="/challenges"
          className="flex items-center justify-between rounded-2xl bg-primary/8 px-4 py-3 text-sm font-bold text-foreground"
        >
          <span>🔥 {currentStreak} day activity streak</span>
          <span className="text-primary">Savings challenges →</span>
        </Link>
        {transactions.length === 0 && openingBalance === 0 && (
          <Link
            to="/money-setup"
            className="block rounded-2xl border border-primary/30 bg-card p-4 text-sm font-semibold text-foreground shadow-soft"
          >
            Start here: Set your opening balance →
          </Link>
        )}
        <Link to="/money-setup" className="block text-right text-xs font-semibold text-primary">
          Manage starting balance
        </Link>

        <div className="flex items-center justify-between pt-1">
          <h2 className="text-[15px] font-extrabold text-foreground">Recent Transactions</h2>
          <Link
            to="/transactions"
            className="flex items-center gap-0.5 text-[13px] font-bold text-primary"
          >
            See All <ChevronRight size={14} />
          </Link>
        </div>

        <div className="space-y-2.5">
          {recent.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>

        <div className="pt-1">
          <InsightBanner text={insight} />
        </div>

        <Link to="/analytics/health" className="block">
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

        <WiseyShortcut />
      </div>
    </Page>
  );
}

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

function weekExpenses(
  transactions: ReturnType<typeof useApp>["transactions"],
  start: string,
  end: string,
) {
  return transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" && transaction.date >= start && transaction.date <= end,
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}
