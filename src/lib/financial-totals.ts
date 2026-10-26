import type { Transaction } from "@/data/types";

export interface FinancialTotals {
  /** Current tracked balance: opening balance plus every recorded transaction. */
  balance: number;
  /** Income recorded inside the requested reporting window. */
  income: number;
  /** Expenses recorded inside the requested reporting window. */
  expenses: number;
  savings: number;
}

/**
 * Keep the live balance global while limiting income/expense stats to the
 * selected month or payment cycle. The dashboard, budget and analytics all
 * use this same calculation so transaction changes stay consistent.
 */
export function calculateFinancialTotals(
  transactions: Transaction[],
  openingBalance: number,
  start?: string,
  end?: string,
): FinancialTotals {
  let balance = Number.isFinite(openingBalance) ? openingBalance : 0;
  let income = 0;
  let expenses = 0;

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    balance += transaction.type === "income" ? amount : -amount;
    const inWindow = (!start || transaction.date >= start) && (!end || transaction.date <= end);
    if (!inWindow) continue;

    if (transaction.type === "income") income += amount;
    else expenses += amount;
  }

  return { balance, income, expenses, savings: Math.max(0, income - expenses) };
}
