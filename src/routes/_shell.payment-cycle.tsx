import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/nav";
import { useApp } from "@/store/app-store";
import { APP_TODAY } from "@/data/mock";
import { getBudgetPeriod } from "@/lib/budget-period";
import { pwHead } from "@/lib/head";

export const Route = createFileRoute("/_shell/payment-cycle")({
  head: () =>
    pwHead("Payment cycle — PlanWisely", "Set the dates for your payday-to-payday budget."),
  component: PaymentCyclePage,
});

function PaymentCyclePage() {
  const { user, setBudgetSchedule } = useApp();
  const [start, setStart] = useState(user.budgetPeriodStart ?? APP_TODAY);
  const [next, setNext] = useState(user.nextPaymentDate ?? "");
  const [pattern, setPattern] = useState<"recurring" | "irregular">(
    user.incomePattern ?? "irregular",
  );
  const [saving, setSaving] = useState(false);
  const period = getBudgetPeriod(APP_TODAY, start, next, pattern);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await setBudgetSchedule(start, next, pattern);
      toast.success("Payment cycle saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the payment cycle.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Page className="min-h-dvh">
      <PageHeader title="Payment cycle" backTo="/dashboard" />
      <form onSubmit={save} className="space-y-4 rounded-3xl bg-card p-5 shadow-soft">
        <div>
          <h2 className="text-lg font-extrabold text-foreground">Budget from payday to payday</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter when this budget period started and the date you expect your next payment. Update
            the next date when your income is irregular.
          </p>
        </div>
        <label className="block text-sm font-semibold text-foreground">
          Period start date
          <input
            required
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3"
          />
        </label>
        <label className="block text-sm font-semibold text-foreground">
          Expected next payment date
          <input
            required
            min={start}
            type="date"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3"
          />
        </label>
        <label className="block text-sm font-semibold text-foreground">
          Income pattern
          <select
            value={pattern}
            onChange={(e) => setPattern(e.target.value as "recurring" | "irregular")}
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3"
          >
            <option value="recurring">Recurring</option>
            <option value="irregular">Irregular</option>
          </select>
        </label>
        <div className="rounded-2xl bg-primary/8 p-4 text-sm text-foreground">
          {period.configured
            ? period.overdue
              ? "That payment date has passed. Update it to keep your budget period current."
              : `${period.daysUntilPayment} days until your next payment.`
            : "Choose valid dates to see your budget period."}
        </div>
        <button
          disabled={saving || !next}
          className="w-full rounded-2xl bg-navy p-3 font-bold text-navy-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save payment cycle"}
        </button>
        <Link to="/upcoming" className="block text-center text-sm font-bold text-primary">
          Manage upcoming expenses
        </Link>
      </form>
    </Page>
  );
}
