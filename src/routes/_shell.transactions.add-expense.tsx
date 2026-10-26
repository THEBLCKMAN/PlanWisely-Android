import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/nav";
import { Field, PrimaryButton, SelectField, TextArea } from "@/components/ui";
import { useApp } from "@/store/app-store";
import { APP_TODAY } from "@/data/mock";
import { pwHead } from "@/lib/head";
import type { CategoryKey, PaymentMethod } from "@/data/types";

export const Route = createFileRoute("/_shell/transactions/add-expense")({
  head: () => pwHead("Add expense — PlanWisely", "Log an expense in seconds."),
  component: AddExpenseScreen,
});

const METHODS: PaymentMethod[] = ["Card", "Cash", "EFT", "NSFAS Wallet"];

function AddExpenseScreen() {
  const navigate = useNavigate();
  const { addTransaction, categories } = useApp();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(APP_TODAY);
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) {
      toast.error("Enter a short description for this expense.");
      return;
    }
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Please enter an amount greater than R0.");
      return;
    }
    if (!category) {
      toast.error("Please choose a category.");
      return;
    }
    if (!date) {
      toast.error("Choose the date of this expense.");
      return;
    }
    setSaving(true);
    try {
      await addTransaction({
        title: title.trim(),
        note: note.trim() || undefined,
        category: category as CategoryKey,
        type: "expense",
        amount: value,
        date,
        method: (method || "Card") as PaymentMethod,
      });
      toast.success("Expense saved!");
      navigate({ to: "/transactions", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page className="min-h-dvh">
      <PageHeader title="Add Expense" backTo="/transactions" />

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
          label="Description"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Groceries or lunch"
        />
        <Field
          label="Amount (R)"
          value={amount}
          onChange={setAmount}
          placeholder="0.00"
          type="number"
        />
        <SelectField
          label="Category"
          value={category}
          onChange={setCategory}
          placeholder="Select Category"
          options={categories
            .filter((c) => c.key !== "bursary")
            .map((c) => ({
              value: c.key,
              label: c.name,
            }))}
        />
        <Field label="Date" value={date} onChange={setDate} type="date" />
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
            {saving ? "Saving…" : "Save Expense"}
          </PrimaryButton>
        </div>
      </motion.form>
    </Page>
  );
}
