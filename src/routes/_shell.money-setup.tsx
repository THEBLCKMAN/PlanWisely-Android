import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/nav";
import { useApp } from "@/store/app-store";
import { pwHead } from "@/lib/head";

export const Route = createFileRoute("/_shell/money-setup")({
  head: () =>
    pwHead(
      "Starting balance — PlanWisely",
      "Set the amount you have before recording transactions.",
    ),
  component: MoneySetup,
});
function MoneySetup() {
  const { openingBalance, setOpeningBalance } = useApp();
  const [amount, setAmount] = useState(String(openingBalance));
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid balance of R0 or more.");
      return;
    }
    setSaving(true);
    try {
      await setOpeningBalance(value);
      toast.success("Starting balance saved.");
      await navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save balance.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Page className="min-h-dvh">
      <PageHeader title="Starting Balance" backTo="/dashboard" />
      <form onSubmit={save} className="space-y-5 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg font-bold">How much money do you have right now?</h2>
        <p className="text-sm text-muted-foreground">
          Enter the money you already have before using PlanWisely. This is not your monthly salary.
          Add salary when you actually receive it using Add Income.
        </p>
        <label className="block text-sm font-semibold" htmlFor="opening-balance">
          Opening balance (R)
        </label>
        <input
          id="opening-balance"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-xl border border-border bg-background p-3 text-foreground"
          required
        />
        <p className="text-xs text-muted-foreground">
          Changing this amount updates your tracked balance. It does not create a transaction. If
          you already recorded income or expenses, avoid counting them again.
        </p>
        <button
          disabled={saving}
          type="submit"
          className="w-full rounded-2xl bg-navy p-3 font-bold text-navy-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save starting balance"}
        </button>
        <Link to="/transactions" className="block text-center text-sm font-semibold text-primary">
          Go to transactions
        </Link>
      </form>
    </Page>
  );
}
