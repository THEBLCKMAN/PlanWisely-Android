import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/nav";
import { Field, PrimaryButton, SelectField, TextArea } from "@/components/ui";
import { useApp } from "@/store/app-store";
import { APP_TODAY } from "@/data/mock";
import { pwHead } from "@/lib/head";
import type { IncomeSource, PaymentMethod } from "@/data/types";

export const Route = createFileRoute("/_shell/transactions/add-income")({
  head: () =>
    pwHead("Add income — PlanWisely", "Log income like bursaries, salaries and side gigs."),
  component: AddIncomeScreen,
});

const INCOME_SOURCES: { value: IncomeSource; label: string }[] = [
  { value: "allowance", label: "Allowance" },
  { value: "bursary_nsfas", label: "Bursary / NSFAS" },
  { value: "part_time_work", label: "Part-time work" },
  { value: "family_support", label: "Family support" },
  { value: "other", label: "Other" },
];

const METHODS: PaymentMethod[] = ["EFT", "Card", "Cash", "NSFAS Wallet"];

function AddIncomeScreen() {
  const navigate = useNavigate();
  const { addTransaction } = useApp();
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<IncomeSource | "">("");
  const [date, setDate] = useState(APP_TODAY);
  const [expectedDate, setExpectedDate] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Please enter an amount greater than R0.");
      return;
    }
    if (!source) {
      toast.error("Please choose an income source.");
      return;
    }
    if (!date) {
      toast.error("Choose the date you received this income.");
      return;
    }
    if (expectedDate && expectedDate < date) {
      toast.error("The next payment date must be on or after this income date.");
      return;
    }
    setSaving(true);
    try {
      await addTransaction({
        title: INCOME_SOURCES.find((s) => s.value === source)?.label ?? "Income",
        note: note.trim() || undefined,
        category: source === "bursary_nsfas" ? "bursary" : "other",
        type: "income",
        amount: value,
        date,
        method: (method || "EFT") as PaymentMethod,
        incomeSource: source,
        isRecurring: recurring,
        expectedNextPaymentDate: expectedDate || undefined,
      });
      toast.success("Income saved!");
      navigate({ to: "/transactions", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page className="min-h-dvh">
      <PageHeader title="Add Income" backTo="/transactions" />

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-4"
      >
        <Field
          label="Amount (R)"
          value={amount}
          onChange={setAmount}
          placeholder="0.00"
          type="number"
        />
        <SelectField
          label="Source"
          value={source}
          onChange={(value) => setSource(value as IncomeSource | "")}
          placeholder="Select Source"
          options={INCOME_SOURCES}
        />
        <Field label="Date" value={date} onChange={setDate} type="date" />
        <Field
          label="Expected next payment date"
          value={expectedDate}
          onChange={setExpectedDate}
          type="date"
        />
        <label className="flex items-center gap-3 rounded-xl bg-card p-4 text-sm font-semibold text-foreground shadow-soft">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(event) => setRecurring(event.target.checked)}
          />
          This income is recurring
        </label>
        <SelectField
          label="Payment Method"
          value={method}
          onChange={setMethod}
          placeholder="Select Method"
          options={METHODS.map((m) => ({ value: m, label: m }))}
        />
        <TextArea
          label="Note (optional)"
          value={note}
          onChange={setNote}
          placeholder="Add notes…"
        />

        <div className="pt-2">
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Income"}
          </PrimaryButton>
        </div>
      </motion.form>
    </Page>
  );
}
