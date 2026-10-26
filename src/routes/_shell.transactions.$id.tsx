import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Page, PageHeader } from "@/components/nav";
import { CategoryIcon } from "@/components/cards";
import {
  Field,
  PrimaryButton,
  SecondaryButton,
  SelectField,
  Sheet,
  TextArea,
} from "@/components/ui";
import { useApp } from "@/store/app-store";
import { APP_TODAY } from "@/data/mock";
import { fmtR, monthName, dayLabel } from "@/lib/format";
import { pwHead } from "@/lib/head";
import type { CategoryKey, IncomeSource } from "@/data/types";

export const Route = createFileRoute("/_shell/transactions/$id")({
  head: () => pwHead("Transaction details — PlanWisely", "View, edit or delete a transaction."),
  component: TransactionDetail,
});

const METHODS = ["Card", "Cash", "EFT", "NSFAS Wallet"];
const INCOME_SOURCES: { value: IncomeSource; label: string }[] = [
  { value: "allowance", label: "Allowance" },
  { value: "bursary_nsfas", label: "Bursary / NSFAS" },
  { value: "part_time_work", label: "Part-time work" },
  { value: "family_support", label: "Family support" },
  { value: "other", label: "Other" },
];

function TransactionDetail() {
  const { id } = Route.useParams() as { id: string };
  const navigate = useNavigate();
  const { transactions, categories, updateTransaction, deleteTransaction } = useApp();
  const tx = transactions.find((t) => t.id === id);

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [amount, setAmount] = useState(tx ? String(tx.amount) : "");
  const [category, setCategory] = useState(tx?.category ?? "");
  const [method, setMethod] = useState(tx?.method ?? "Card");
  const [note, setNote] = useState(tx?.note ?? "");
  const [title, setTitle] = useState(tx?.title ?? "");
  const [date, setDate] = useState(tx?.date ?? APP_TODAY);
  const [incomeSource, setIncomeSource] = useState<IncomeSource>(tx?.incomeSource ?? "other");
  const [recurring, setRecurring] = useState(Boolean(tx?.isRecurring));
  const [expectedDate, setExpectedDate] = useState(tx?.expectedNextPaymentDate ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!tx) {
    return (
      <Page className="min-h-dvh">
        <PageHeader title="Transaction" backTo="/transactions" />
        <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">This transaction no longer exists.</p>
        </div>
      </Page>
    );
  }

  const editableCategories = categories.filter((c) =>
    tx.type === "income" ? c.key === "bursary" || c.key === "other" : c.key !== "bursary",
  );
  if (!editableCategories.some((c) => c.key === tx.category)) {
    editableCategories.push({
      key: tx.category,
      name: tx.category,
      budget: 0,
      icon: "package",
      accentClass: "bg-muted-foreground",
    });
  }

  const saveEdit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Please enter an amount greater than R0.");
      return;
    }
    if (!date) {
      toast.error("Choose the transaction date.");
      return;
    }
    if (tx.type === "income" && expectedDate && expectedDate < date) {
      toast.error("The next payment date must be on or after this income date.");
      return;
    }
    setSaving(true);
    try {
      await updateTransaction({
        ...tx,
        title: title.trim() || (tx.type === "income" ? "Income" : "Expense"),
        amount: value,
        category: category as CategoryKey,
        method: method as typeof tx.method,
        date,
        note: note.trim() || undefined,
        incomeSource: tx.type === "income" ? incomeSource : undefined,
        isRecurring: tx.type === "income" ? recurring : false,
        expectedNextPaymentDate: tx.type === "income" ? expectedDate || undefined : undefined,
      });
      toast.success("Transaction updated");
      setEditOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update transaction.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteTransaction(tx.id);
      toast.success("Transaction deleted");
      navigate({ to: "/transactions", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete transaction.");
      setDeleting(false);
    }
  };

  return (
    <Page className="min-h-dvh">
      <PageHeader title="Details" backTo="/transactions" />

      {/* Amount card (crimson, matching the Figma transaction detail card) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-crimson to-crimson/85 p-6 text-center text-navy-foreground shadow-float"
      >
        <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">
          <CategoryIconDark category={tx.category} />
          {tx.title}
        </div>
        <div
          className={`mt-2 text-[36px] font-extrabold tracking-tight ${tx.type === "income" ? "text-white" : ""}`}
        >
          {tx.type === "income" ? "+" : "−"}
          {fmtR(tx.amount)}
        </div>
        <div className="mt-1 text-xs opacity-80">
          {dayLabel(tx.date)} · {monthName(tx.date)} {new Date(tx.date).getFullYear()}
        </div>
        <span className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-xl" />
      </motion.div>

      {/* Details */}
      <div className="mt-4 rounded-2xl bg-card p-5 shadow-soft">
        <h2 className="text-[15px] font-extrabold text-foreground">Transaction Details</h2>
        <div className="mt-3 space-y-3 text-sm">
          <Row
            label="Category"
            value={categories.find((c) => c.key === tx.category)?.name ?? tx.category}
          />
          <Row label="Type" value={tx.type === "income" ? "Income" : "Expense"} />
          <Row label="Payment Method" value={tx.method} />
          <Row label="Note" value={tx.note || "—"} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <SecondaryButton onClick={() => setEditOpen(true)}>
          <span className="flex items-center justify-center gap-2">
            <Pencil size={16} /> Edit
          </span>
        </SecondaryButton>
        <SecondaryButton onClick={() => setConfirmDelete(true)}>
          <span className="flex items-center justify-center gap-2 text-destructive">
            <Trash2 size={16} /> Delete
          </span>
        </SecondaryButton>
      </div>

      {/* Edit sheet */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Transaction">
        <div className="space-y-4">
          <Field label="Amount (R)" value={amount} onChange={setAmount} type="number" />
          <Field label="Description" value={title} onChange={setTitle} />
          <SelectField
            label="Category"
            value={category}
            onChange={setCategory}
            placeholder="Select Category"
            options={editableCategories.map((c) => ({ value: c.key, label: c.name }))}
          />
          {tx.type === "income" && (
            <>
              <SelectField
                label="Income source"
                value={incomeSource}
                onChange={(v) => setIncomeSource(v as IncomeSource)}
                options={INCOME_SOURCES}
              />
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
            </>
          )}
          <Field label="Date" value={date} onChange={setDate} type="date" />
          <SelectField
            label="Payment Method"
            value={method}
            onChange={(v) => setMethod(v as typeof method)}
            placeholder="Select Method"
            options={METHODS.map((m) => ({ value: m, label: m }))}
          />
          <TextArea label="Note" value={note} onChange={setNote} placeholder="Add notes…" />
          <PrimaryButton onClick={saveEdit} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </PrimaryButton>
        </div>
      </Sheet>

      {/* Delete confirmation sheet */}
      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete transaction?"
      >
        <p className="text-sm text-muted-foreground">
          This will permanently remove <span className="font-bold text-foreground">{tx.title}</span>{" "}
          from your history. This cannot be undone.
        </p>
        <div className="mt-4 space-y-2.5">
          <PrimaryButton
            onClick={remove}
            disabled={deleting}
            className="bg-destructive shadow-float"
          >
            {deleting ? "Deleting…" : "Yes, delete it"}
          </PrimaryButton>
          <SecondaryButton onClick={() => setConfirmDelete(false)}>Keep it</SecondaryButton>
        </div>
      </Sheet>
    </Page>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2.5 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}

function CategoryIconDark({ category }: { category: CategoryKey }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
      <CategoryIcon category={category} />
    </span>
  );
}
