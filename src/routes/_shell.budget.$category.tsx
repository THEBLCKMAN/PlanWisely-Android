import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CategoryBanner, TransactionRow } from "@/components/cards";
import { Page, PageHeader } from "@/components/nav";
import { useApp } from "@/store/app-store";
import { APP_TODAY, CATEGORIES } from "@/data/mock";
import { fmtR, monthName } from "@/lib/format";
import { pwHead } from "@/lib/head";
import { ProgressBar } from "@/components/ui";
import { Field, PrimaryButton, SecondaryButton, Sheet } from "@/components/ui";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell/budget/$category")({
  head: () => pwHead("Category — PlanWisely", "Category budget and transactions."),
  component: CategoryScreen,
});

function CategoryScreen() {
  const { category } = Route.useParams() as { category: string };
  const { transactions, categories, spentByCategory, updateCategoryBudget, getCategoryBudget } =
    useApp();
  const meta = categories.find((c) => c.key === category) ?? categories[0] ?? CATEGORIES[0];
  const [month, setMonth] = useState(APP_TODAY.slice(0, 7));
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(String(meta.budget));
  const spent = spentByCategory(month)[meta.key] ?? 0;
  const monthTx = transactions
    .filter((t) => t.date.startsWith(month) && t.category === meta.key)
    .sort((a, b) => b.date.localeCompare(a.date));
  const budget = getCategoryBudget(meta.key, month);
  const pct = budget === 0 ? 0 : Math.round((spent / budget) * 100);

  const saveBudget = async () => {
    const amount = Number(budgetDraft);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a monthly budget above R0.");
      return;
    }
    try {
      await updateCategoryBudget(meta.key, amount, month);
      setBudgetOpen(false);
      toast.success("Budget updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this budget.");
    }
  };

  return (
    <Page className="min-h-dvh">
      <PageHeader
        title={meta.name}
        backTo="/budget"
        right={
          <button
            onClick={() => {
              setBudgetDraft(String(meta.budget));
              setBudgetOpen(true);
            }}
            className="rounded-full bg-card px-3 py-2 text-xs font-bold text-primary shadow-soft"
          >
            Edit budget
          </button>
        }
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <CategoryBanner name={meta.name} banner={meta.banner} />
      </motion.div>

      {/* Month navigation */}
      <div className="my-4 flex items-center justify-center gap-6">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted-foreground shadow-soft"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="rounded-full bg-card px-5 py-2 text-sm font-bold text-foreground shadow-soft">
          {monthName(`${month}-01`)} {month.slice(0, 4)}
        </span>
        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted-foreground shadow-soft"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Budget status */}
      <div className="mb-4 rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Budget used</span>
          <span className="text-[15px] font-extrabold text-foreground">
            {fmtR(spent, { decimals: false })}{" "}
            <span className="font-medium text-muted-foreground">
              / {fmtR(budget, { decimals: false })}
            </span>
          </span>
        </div>
        <div className="mt-2.5">
          <ProgressBar value={pct} />
        </div>
        <div className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
          {pct}% of monthly budget
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-foreground">Transactions</h2>
        <Link
          to="/transactions/add-expense"
          className="flex items-center gap-1 rounded-full bg-primary px-3.5 py-2 text-[13px] font-bold text-primary-foreground shadow-soft"
        >
          <Plus size={14} /> Add
        </Link>
      </div>

      {monthTx.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">
            No {meta.name.toLowerCase()} transactions yet this month.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {monthTx.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {categories.length} categories tracked · budgets reset monthly
      </p>

      <Sheet
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title={`Edit ${meta.name} budget`}
      >
        <div className="space-y-3">
          <Field
            label="Monthly budget (R)"
            value={budgetDraft}
            onChange={setBudgetDraft}
            type="number"
          />
          <PrimaryButton onClick={saveBudget}>Save budget</PrimaryButton>
          <SecondaryButton onClick={() => setBudgetOpen(false)}>Cancel</SecondaryButton>
          <p className="text-center text-[11px] text-muted-foreground">
            Your monthly limit is saved to your account.
          </p>
        </div>
      </Sheet>
    </Page>
  );
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
