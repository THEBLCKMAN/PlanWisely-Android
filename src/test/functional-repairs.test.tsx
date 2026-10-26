import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatInput } from "@/components/chat-input";
import { TrendChart } from "@/components/charts";
import { TransactionRow } from "@/components/cards";
import { calculateSafeToSpend, getBudgetPeriod } from "@/lib/budget-period";
import { calculateFinancialTotals } from "@/lib/financial-totals";
import { AppProvider, useApp } from "@/store/app-store";
import type { User } from "@supabase/supabase-js";

const { fakeSupabase } = vi.hoisted(() => {
  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of [
      "select",
      "insert",
      "update",
      "delete",
      "upsert",
      "eq",
      "order",
      "limit",
      "is",
      "gte",
      "lte",
      "not",
    ]) {
      chain[method] = vi.fn(() => chain);
    }
    chain["single"] = vi.fn(async () => ({
      data:
        table === "finance_categories"
          ? {
              id: "category-test",
              category_key: "school-supplies",
              name: "School supplies",
              icon: "package",
              accent_class: "bg-muted-foreground",
              essential: false,
              is_active: true,
            }
          : { id: "goal-test" },
      error: null,
    }));
    chain["maybeSingle"] = vi.fn(async () => ({ data: null, error: null }));
    chain["then"] = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve, reject);
    return chain;
  });
  const rpc = vi.fn(async (name: string) => ({
    data:
      name === "add_goal_contribution"
        ? 1000
        : name === "record_meaningful_activity"
          ? { current_streak: 1 }
          : false,
    error: null,
  }));
  return { fakeSupabase: { from, rpc } };
});

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => fakeSupabase,
  isSupabaseConfigured: true,
  getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
}));

const authUser = { id: "test-user", email: "test@example.com", user_metadata: {} } as User;

describe("PlanWisely interactions", () => {
  it("submits a trimmed Wisey message and blocks an empty message", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByRole("textbox", { name: "Message Wisey" });
    const send = screen.getByRole("button", { name: "Send message" });

    expect(send).toBeDisabled();
    fireEvent.change(input, { target: { value: "  Help me budget  " } });
    fireEvent.submit(input.closest("form")!);

    expect(onSend).toHaveBeenCalledOnce();
    expect(onSend).toHaveBeenCalledWith("Help me budget");
    expect(input).toHaveValue("");
  });

  it("opens a transaction when its row is selected", () => {
    const onClick = vi.fn();
    render(
      <TransactionRow
        tx={{
          id: "tx-1",
          title: "Lunch",
          category: "food",
          type: "expense",
          amount: 85,
          date: "2026-10-26",
          method: "Cash",
        }}
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open transaction: Lunch" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("updates the shared balance and month totals after adding, editing, and deleting transactions", async () => {
    function FinancialActions() {
      const {
        transactions,
        loading,
        setOpeningBalance,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        totalsForMonth,
        totalsForPeriod,
      } = useApp();
      const monthTotals = totalsForMonth("2026-10");
      const cycleTotals = totalsForPeriod("2026-10-01", "2026-10-31");
      return (
        <div>
          <output data-testid="finance-loading">{String(loading)}</output>
          <output data-testid="month-balance">{monthTotals.balance}</output>
          <output data-testid="month-expenses">{monthTotals.expenses}</output>
          <output data-testid="cycle-balance">{cycleTotals.balance}</output>
          <output data-testid="cycle-income">{cycleTotals.income}</output>
          <output data-testid="transaction-count">{transactions.length}</output>
          <button onClick={() => setOpeningBalance(1000)}>Set opening balance</button>
          <button
            onClick={() =>
              addTransaction({
                title: "Groceries",
                category: "food",
                type: "expense",
                amount: 100,
                date: "2026-10-26",
                method: "Card",
              })
            }
          >
            Add expense
          </button>
          <button
            onClick={() => {
              const tx = transactions[0];
              if (tx) updateTransaction({ ...tx, amount: 150 });
            }}
          >
            Edit expense
          </button>
          <button onClick={() => transactions[0] && deleteTransaction(transactions[0].id)}>
            Delete transaction
          </button>
          <button
            onClick={() =>
              addTransaction({
                title: "Allowance",
                category: "other",
                type: "income",
                amount: 500,
                date: "2026-10-26",
                method: "EFT",
              })
            }
          >
            Add income
          </button>
        </div>
      );
    }

    render(
      <AppProvider authUser={authUser}>
        <FinancialActions />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("finance-loading")).toHaveTextContent("false"));
    fireEvent.click(screen.getByText("Set opening balance"));
    await waitFor(() => expect(screen.getByTestId("month-balance")).toHaveTextContent("1000"));

    fireEvent.click(screen.getByText("Add expense"));
    await waitFor(() => {
      expect(screen.getByTestId("month-balance")).toHaveTextContent("900");
      expect(screen.getByTestId("month-expenses")).toHaveTextContent("100");
    });
    expect(screen.getByTestId("cycle-balance")).toHaveTextContent("900");

    fireEvent.click(screen.getByText("Edit expense"));
    await waitFor(() => {
      expect(screen.getByTestId("month-balance")).toHaveTextContent("850");
      expect(screen.getByTestId("month-expenses")).toHaveTextContent("150");
    });

    fireEvent.click(screen.getByText("Delete transaction"));
    await waitFor(() => {
      expect(screen.getByTestId("month-balance")).toHaveTextContent("1000");
      expect(screen.getByTestId("transaction-count")).toHaveTextContent("0");
    });

    fireEvent.click(screen.getByText("Add income"));
    await waitFor(() => {
      expect(screen.getByTestId("month-balance")).toHaveTextContent("1500");
      expect(screen.getByTestId("cycle-income")).toHaveTextContent("500");
    });
  });

  it("keeps current balance global while limiting selected-period stats", () => {
    const totals = calculateFinancialTotals(
      [
        {
          id: "old-income",
          title: "Earlier allowance",
          category: "other",
          type: "income",
          amount: 1000,
          date: "2026-09-10",
          method: "EFT",
        },
        {
          id: "current-expense",
          title: "Groceries",
          category: "food",
          type: "expense",
          amount: 200,
          date: "2026-10-26",
          method: "Card",
        },
      ],
      500,
      "2026-10-01",
      "2026-10-31",
    );
    expect(totals.balance).toBe(1300);
    expect(totals.income).toBe(0);
    expect(totals.expenses).toBe(200);
  });

  it("supports creating, contributing to, editing, and deleting savings goals", async () => {
    function GoalActions() {
      const {
        savingsGoals,
        addSavingsGoal,
        addSavingsContribution,
        updateSavingsGoal,
        deleteSavingsGoal,
        loading,
      } = useApp();
      const goal = savingsGoals[0];
      return (
        <div>
          <output data-testid="loading">{String(loading)}</output>
          <output data-testid="goal-count">{savingsGoals.length}</output>
          <output data-testid="saved">{goal?.savedAmount ?? 0}</output>
          <button
            onClick={() =>
              addSavingsGoal({ name: "Emergency", category: "emergency", targetAmount: 1000 })
            }
          >
            Create
          </button>
          <button onClick={() => goal && addSavingsContribution(goal.id, 1200)}>Contribute</button>
          <button onClick={() => goal && updateSavingsGoal({ ...goal, name: "Edited fund" })}>
            Edit
          </button>
          <button onClick={() => goal && deleteSavingsGoal(goal.id)}>Delete</button>
          <output data-testid="goal-name">{goal?.name ?? ""}</output>
        </div>
      );
    }

    render(
      <AppProvider authUser={authUser}>
        <GoalActions />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    fireEvent.click(screen.getByText("Create"));
    await waitFor(() => expect(screen.getByTestId("goal-count")).toHaveTextContent("1"));
    fireEvent.click(screen.getByText("Contribute"));
    await waitFor(() => expect(screen.getByTestId("saved")).toHaveTextContent("1000"));
    fireEvent.click(screen.getByText("Edit"));
    await waitFor(() => expect(screen.getByTestId("goal-name")).toHaveTextContent("Edited fund"));
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => expect(screen.getByTestId("goal-count")).toHaveTextContent("0"));
  });

  it("uses the same active categories and separate monthly budgets across both pages", async () => {
    function BudgetCategoryActions() {
      const {
        categories,
        loading,
        getCategoryBudget,
        updateCategoryBudget,
        createBudgetCategory,
        deleteBudgetCategory,
      } = useApp();
      return (
        <div>
          <output data-testid="budget-loading">{String(loading)}</output>
          <output data-testid="october-budget">{getCategoryBudget("food", "2026-10")}</output>
          <output data-testid="november-budget">{getCategoryBudget("food", "2026-11")}</output>
          <output data-testid="active-categories">{categories.length}</output>
          <button onClick={() => updateCategoryBudget("food", 2000, "2026-10")}>
            Save October
          </button>
          <button onClick={() => createBudgetCategory("School supplies", 500, "2026-10")}>
            Add category
          </button>
          <button onClick={() => deleteBudgetCategory("school-supplies")}>Remove category</button>
        </div>
      );
    }

    render(
      <AppProvider authUser={authUser}>
        <BudgetCategoryActions />
      </AppProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("budget-loading")).toHaveTextContent("false"));
    fireEvent.click(screen.getByText("Save October"));
    await waitFor(() => expect(screen.getByTestId("october-budget")).toHaveTextContent("2000"));
    expect(screen.getByTestId("november-budget")).toHaveTextContent("0");
    fireEvent.click(screen.getByText("Add category"));
    await waitFor(() => expect(screen.getByTestId("active-categories")).toHaveTextContent("9"));
    expect(screen.getByTestId("october-budget")).toHaveTextContent("2000");
    fireEvent.click(screen.getByText("Remove category"));
    await waitFor(() => expect(screen.getByTestId("active-categories")).toHaveTextContent("8"));
  });

  it("renders an empty or flat spending trend without invalid chart geometry", () => {
    const { rerender, container } = render(<TrendChart data={[]} />);
    expect(container.querySelector("svg path")).toHaveAttribute("d");
    rerender(<TrendChart data={[0, 0, 0, 0, 0]} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("calculates safe-to-spend using only the current payment cycle", () => {
    const result = calculateSafeToSpend({
      budget: 300,
      today: "2026-10-15",
      periodStart: "2026-10-10",
      nextPaymentDate: "2026-10-20",
      transactions: [
        {
          id: "1",
          title: "Groceries",
          category: "food",
          type: "expense",
          amount: 80,
          date: "2026-10-11",
          method: "Card",
        },
        {
          id: "2",
          title: "Bus",
          category: "transport",
          type: "expense",
          amount: 40,
          date: "2026-10-15",
          method: "Cash",
        },
        {
          id: "3",
          title: "Older cost",
          category: "food",
          type: "expense",
          amount: 500,
          date: "2026-10-09",
          method: "Cash",
        },
      ],
      upcomingExpenses: [
        {
          id: "4",
          title: "Rent",
          category: "rent",
          amount: 50,
          dueDate: "2026-10-20",
          essential: true,
          status: "planned",
        },
        {
          id: "5",
          title: "Later",
          category: "other",
          amount: 60,
          dueDate: "2026-10-21",
          essential: false,
          status: "planned",
        },
      ],
    });
    expect(result.spent).toBe(120);
    expect(result.upcoming).toBe(50);
    expect(result.safeToSpend).toBe(130);
    expect(result.dailyAllowance).toBe(26);
    expect(result.averageDailySpend).toBe(20);
    expect(result.daysMoneyLasts).toBe(6.5);
    expect(result.percentUsed).toBe(40);
  });

  it("handles a missing payment date, overdue irregular cycles, and recurring roll-forward", () => {
    const missing = calculateSafeToSpend({
      budget: 250,
      transactions: [],
      upcomingExpenses: [],
      today: "2026-10-15",
    });
    expect(missing.safeToSpend).toBe(250);
    expect(missing.dailyAllowance).toBe(0);

    const overdue = calculateSafeToSpend({
      budget: 100,
      today: "2026-10-22",
      periodStart: "2026-10-01",
      nextPaymentDate: "2026-10-20",
      transactions: [
        {
          id: "1",
          title: "Bus",
          category: "transport",
          type: "expense",
          amount: 120,
          date: "2026-10-21",
          method: "Cash",
        },
      ],
      upcomingExpenses: [
        {
          id: "2",
          title: "Food",
          category: "food",
          amount: 20,
          dueDate: "2026-10-21",
          essential: true,
          status: "planned",
        },
      ],
    });
    expect(overdue.overdue).toBe(true);
    expect(overdue.safeToSpend).toBe(-40);
    expect(overdue.dailyAllowance).toBe(-40);

    expect(getBudgetPeriod("2026-10-31", "2026-10-01", "2026-10-30", "recurring").start).toBe(
      "2026-10-31",
    );
  });
});
