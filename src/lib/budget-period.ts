import type { Transaction, UpcomingExpense } from "@/data/types";

const dayMs = 86_400_000;
const toUTC = (date: string) => {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export function differenceInDays(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / dayMs);
}

export function getBudgetPeriod(
  today: string,
  start?: string,
  next?: string,
  pattern: "recurring" | "irregular" = "irregular",
) {
  if (!start || !next || next < start)
    return {
      start: undefined,
      end: undefined,
      daysUntilPayment: 0,
      daysPassed: 0,
      configured: false,
      overdue: false,
    };
  let periodStart = start;
  let periodEnd = next;
  if (pattern === "recurring" && periodEnd < today) {
    const length = Math.max(1, differenceInDays(periodStart, periodEnd));
    while (periodEnd < today) {
      periodStart = new Date(toUTC(periodEnd) + dayMs).toISOString().slice(0, 10);
      periodEnd = new Date(toUTC(periodStart) + (length - 1) * dayMs).toISOString().slice(0, 10);
    }
  }
  const overdue = periodEnd < today;
  return {
    start: periodStart,
    end: periodEnd,
    daysUntilPayment: Math.max(0, differenceInDays(today, periodEnd)),
    daysPassed: Math.max(1, differenceInDays(periodStart, today) + 1),
    configured: true,
    overdue,
  };
}

export function calculateSafeToSpend(input: {
  budget: number;
  transactions: Transaction[];
  upcomingExpenses: UpcomingExpense[];
  periodStart?: string;
  nextPaymentDate?: string;
  incomePattern?: "recurring" | "irregular";
  today: string;
}) {
  const period = getBudgetPeriod(
    input.today,
    input.periodStart,
    input.nextPaymentDate,
    input.incomePattern,
  );
  if (!period.configured || !period.start || !period.end) {
    return {
      ...period,
      budget: input.budget,
      spent: 0,
      remaining: input.budget,
      percentUsed: 0,
      upcoming: 0,
      safeToSpend: input.budget,
      dailyAllowance: 0,
      averageDailySpend: 0,
      daysMoneyLasts: 0,
    };
  }
  const spent = input.transactions
    .filter((tx) => tx.type === "expense" && tx.date >= period.start! && tx.date <= input.today)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const remaining = input.budget - spent;
  const upcoming = input.upcomingExpenses
    .filter(
      (expense) =>
        expense.status === "planned" && (period.overdue || expense.dueDate <= period.end!),
    )
    .reduce((sum, expense) => sum + expense.amount, 0);
  const safeToSpend = remaining - upcoming;
  const averageDailySpend = spent / Math.max(period.daysPassed, 1);
  return {
    ...period,
    budget: input.budget,
    spent,
    remaining,
    percentUsed: input.budget > 0 ? (spent / input.budget) * 100 : 0,
    upcoming,
    safeToSpend,
    dailyAllowance:
      period.daysUntilPayment > 0 ? safeToSpend / period.daysUntilPayment : safeToSpend,
    averageDailySpend,
    daysMoneyLasts: averageDailySpend > 0 ? Math.max(0, safeToSpend / averageDailySpend) : 0,
  };
}
