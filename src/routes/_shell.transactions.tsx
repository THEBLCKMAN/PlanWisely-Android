import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDownCircle, ArrowUpCircle, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { TransactionRow } from "@/components/cards";
import { Page, PageHeader } from "@/components/nav";
import { Field, SelectField, TextArea } from "@/components/ui";
import { useApp } from "@/store/app-store";
import { pwHead } from "@/lib/head";
import type { CategoryKey, IncomeSource, PaymentMethod, TxType } from "@/data/types";

export const Route = createFileRoute("/_shell/transactions")({
  head: () => pwHead("Transactions — PlanWisely", "Your income and expenses."),
  component: TransactionsScreen,
});

const incomeOptions: { value: IncomeSource; label: string }[] = [
  { value: "allowance", label: "Allowance" },
  { value: "bursary_nsfas", label: "Bursary / NSFAS" },
  { value: "part_time_work", label: "Salary / Work" },
  { value: "family_support", label: "Family support" },
  { value: "other", label: "Other income" },
];
const today = () => new Date().toLocaleDateString("en-CA");

function TransactionsScreen() {
  const navigate = useNavigate();
  const { transactions, categories, addTransaction } = useApp();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState<IncomeSource | "">("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const start = (next: TxType) => {
    setType(next);
    setAmount("");
    setTitle("");
    setCategory("");
    setSource("");
    setDate(today());
    setNote("");
    setOpen(true);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter an amount greater than R0.");
    if (!date) return toast.error("Choose a transaction date.");
    if (type === "expense" && !category) return toast.error("Choose an expense category.");
    if (type === "income" && !source) return toast.error("Choose an income source.");
    const incomeTitle = incomeOptions.find((item) => item.value === source)?.label ?? "Income";
    submitting.current = true;
    setSaving(true);
    try {
      await addTransaction({
        title: title.trim() || (type === "income" ? incomeTitle : categories.find(c => c.key === category)?.name ?? "Expense"),
        amount: value,
        type,
        category: (type === "income" ? (source === "bursary_nsfas" ? "bursary" : "other") : category) as CategoryKey,
        date,
        note: note.trim() || undefined,
        method: (type === "income" ? "EFT" : "Card") as PaymentMethod,
        ...(type === "income" ? { incomeSource: source as IncomeSource } : {}),
      });
      toast.success(type === "income" ? "Income recorded" : "Expense recorded");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save transaction.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Page className="min-h-dvh">
      <PageHeader title="Transaction" left="menu" right={
        <button type="button" onClick={() => start("expense")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-navy-foreground shadow-soft"
          aria-label="Add transaction"><Plus size={22} /></button>
      } />
      <p className="mb-4 text-sm text-muted-foreground">Record money you spend or receive. Your dashboard, budgets and analytics update from saved transactions.</p>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => start("expense")} className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3.5 text-sm font-bold text-destructive shadow-soft"><ArrowDownCircle size={18}/> Add Expense</button>
        <button type="button" onClick={() => start("income")} className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3.5 text-sm font-bold text-success shadow-soft"><ArrowUpCircle size={18}/> Add Income</button>
      </div>
      {sorted.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center shadow-soft"><p className="text-sm text-muted-foreground">No transactions here yet. Tap + to record your first one.</p></div>
      ) : <div className="space-y-2.5">{sorted.map(tx => <TransactionRow key={tx.id} tx={tx} onClick={() => navigate({ to: "/transactions/$id", params: { id: tx.id } })} />)}</div>}
      {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-background p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between"><h2 id="transaction-modal-title" className="text-lg font-bold">Add Transaction</h2><button type="button" aria-label="Close" disabled={saving} onClick={() => setOpen(false)}><X size={22}/></button></div>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button type="button" disabled={saving} onClick={() => setType("expense")} className={`rounded-xl px-3 py-3 text-sm font-bold ${type === "expense" ? "bg-destructive text-white" : "bg-card text-destructive"}`}>Expense</button>
            <button type="button" disabled={saving} onClick={() => setType("income")} className={`rounded-xl px-3 py-3 text-sm font-bold ${type === "income" ? "bg-success text-white" : "bg-card text-success"}`}>Income</button>
          </div>
          <form onSubmit={save} className="space-y-3">
            <Field label="Amount (R)" type="number" value={amount} onChange={setAmount} placeholder="0.00" />
            {type === "expense" ? <SelectField label="Expense category" value={category} onChange={setCategory} placeholder="Choose category" options={categories.filter(c => c.key !== "bursary").map(c => ({ value: c.key, label: c.name }))}/> : <SelectField label="Income source" value={source} onChange={v => setSource(v as IncomeSource)} placeholder="Choose source" options={incomeOptions}/>}
            <Field label="Description (optional)" value={title} onChange={setTitle} placeholder={type === "expense" ? "e.g. Groceries" : "e.g. Salary"}/>
            <Field label="Date" type="date" value={date} onChange={setDate}/>
            <TextArea label="Note (optional)" value={note} onChange={setNote} rows={2}/>
            <p className="text-xs text-muted-foreground">{type === "expense" ? "This amount will be deducted from your tracked balance." : "This amount will be added to your tracked balance."}</p>
            <button type="submit" disabled={saving} className="w-full rounded-xl bg-navy px-4 py-3 font-bold text-navy-foreground disabled:opacity-50">{saving ? "Saving…" : type === "expense" ? "Save Expense" : "Save Income"}</button>
          </form>
        </div>
      </div>}
    </Page>
  );
}
