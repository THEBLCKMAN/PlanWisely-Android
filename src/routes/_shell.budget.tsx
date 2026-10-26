import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { BudgetCategoryCard } from "@/components/cards";
import { Page, PageHeader } from "@/components/nav";
import { useApp } from "@/store/app-store";
import { useState } from "react";
import { APP_TODAY } from "@/data/mock";
import { fmtR, monthName } from "@/lib/format";
import { pwHead } from "@/lib/head";
import { Field, PrimaryButton, SecondaryButton, Sheet } from "@/components/ui";
import type { CategoryMeta } from "@/data/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell/budget")({
  head: () => pwHead("Budget — PlanWisely", "Create and track your monthly category budgets."),
  component: BudgetScreen,
});

function BudgetScreen() {
  const {
    categories,
    spentByCategory,
    totalsForMonth,
    getCategoryBudget,
    updateCategoryBudget,
    createBudgetCategory,
    deleteBudgetCategory,
  } = useApp();
  const [month, setMonth] = useState(APP_TODAY.slice(0, 7));
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryMeta | null>(null);
  const [newCategory, setNewCategory] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [amountDraft, setAmountDraft] = useState("");
  const spent = spentByCategory(month);
  const totals = totalsForMonth(month);
  const totalBudget = categories.reduce((s, c) => s + getCategoryBudget(c.key, month), 0);
  const totalSpent = categories.reduce((s, c) => s + (spent[c.key] ?? 0), 0);

  const editCategory = (category: CategoryMeta) => {
    setSelectedCategory(category);
    setNewCategory(false);
    setAmountDraft(String(getCategoryBudget(category.key, month)));
    setEditorOpen(true);
  };
  const addCategory = () => {
    setSelectedCategory(null);
    setNewCategory(true);
    setNameDraft("");
    setAmountDraft("");
    setEditorOpen(true);
  };
  const saveCategory = async () => {
    const amount = Number(amountDraft);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid monthly budget amount.");
      return;
    }
    try {
      if (newCategory) await createBudgetCategory(nameDraft, amount, month);
      else if (selectedCategory) await updateCategoryBudget(selectedCategory.key, amount, month);
      setEditorOpen(false);
      toast.success(newCategory ? "Budget category added." : "Budget saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this budget.");
    }
  };
  const removeCategory = async () => {
    if (!selectedCategory) return;
    if (
      !window.confirm(
        `Remove ${selectedCategory.name} from your budget and expense options? Past transactions will stay in your history.`,
      )
    )
      return;
    try {
      await deleteBudgetCategory(selectedCategory.key);
      setEditorOpen(false);
      toast.success(`${selectedCategory.name} removed from active categories.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove this category.");
    }
  };

  return (
    <Page className="min-h-dvh">
      <PageHeader
        title="Budget"
        left="menu"
        right={
          <button
            type="button"
            onClick={addCategory}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-soft text-foreground"
            aria-label="Add budget category"
          >
            <Plus size={18} />
          </button>
        }
      />

      {/* Month switcher */}
      <div className="flex items-center justify-center gap-6 pb-4">
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

      {/* Overview card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="gradient-navy mb-4 rounded-3xl p-5 text-navy-foreground shadow-float"
      >
        <div className="text-xs font-semibold uppercase tracking-wide opacity-75">
          Total budget · {monthName(`${month}-01`)}
        </div>
        <div className="mt-1 text-[28px] font-extrabold tracking-tight">
          {fmtR(totalBudget, { decimals: false })}
        </div>
        <div className="mt-2 flex items-center justify-between text-[13px] font-semibold">
          <span className="opacity-80">Spent so far</span>
          <span>
            {fmtR(totalSpent, { decimals: false })} · balance{" "}
            {fmtR(totals.balance, { decimals: false })}
          </span>
        </div>
      </motion.div>

      <div className="space-y-3">
        {categories.map((c) => (
          <BudgetCategoryCard
            key={c.key}
            name={c.name}
            spent={spent[c.key] ?? 0}
            budget={getCategoryBudget(c.key, month)}
            category={c.key}
            banner={c.banner}
            onClick={() => editCategory(c)}
          />
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Tap a category to edit its budget for {monthName(`${month}-01`)}. Your active categories
        also control which categories are available when you add an expense.
      </p>

      <Sheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={newCategory ? "Add budget category" : `Edit ${selectedCategory?.name ?? "category"}`}
      >
        <div className="space-y-4">
          {newCategory && (
            <Field
              label="Category name"
              value={nameDraft}
              onChange={setNameDraft}
              placeholder="e.g. School supplies"
            />
          )}
          <Field
            label={`Budget for ${monthName(`${month}-01`)} (R)`}
            value={amountDraft}
            onChange={setAmountDraft}
            placeholder="0.00"
            type="number"
          />
          <PrimaryButton onClick={saveCategory}>
            {newCategory ? "Add category and save" : "Save changes"}
          </PrimaryButton>
          {!newCategory && selectedCategory && (
            <SecondaryButton onClick={removeCategory} className="text-destructive">
              Remove category
            </SecondaryButton>
          )}
          <SecondaryButton onClick={() => setEditorOpen(false)}>Cancel</SecondaryButton>
          <p className="text-center text-xs text-muted-foreground">
            Expenses you add under this category will update its spent amount automatically.
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
