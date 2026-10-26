import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/nav";
import { CATEGORIES, APP_TODAY } from "@/data/mock";
import { useApp } from "@/store/app-store";
import type { CategoryKey, UpcomingExpense } from "@/data/types";
import { fmtR } from "@/lib/format";
import { pwHead } from "@/lib/head";

export const Route = createFileRoute("/_shell/upcoming")({
  head: () =>
    pwHead("Upcoming expenses — PlanWisely", "Plan bills and costs due before your next payment."),
  component: UpcomingExpensesPage,
});

const expenseCategories = CATEGORIES.filter((c) =>
  ["food", "transport", "rent", "airtime", "entertainment", "other", "electricity"].includes(c.key),
);

function UpcomingExpensesPage() {
  const {
    upcomingExpenses,
    addUpcomingExpense,
    updateUpcomingExpense,
    deleteUpcomingExpense,
    markUpcomingExpensePaid,
  } = useApp();
  const [editing, setEditing] = useState<UpcomingExpense | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CategoryKey>("rent");
  const [dueDate, setDueDate] = useState("");
  const [essential, setEssential] = useState(true);
  const [busy, setBusy] = useState(false);
  const reset = () => {
    setEditing(null);
    setTitle("");
    setAmount("");
    setCategory("rent");
    setDueDate("");
    setEssential(true);
  };
  const edit = (item: UpcomingExpense) => {
    setEditing(item);
    setTitle(item.title);
    setAmount(String(item.amount));
    setCategory(item.category);
    setDueDate(item.dueDate);
    setEssential(item.essential);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!title.trim() || !Number.isFinite(n) || n <= 0 || !dueDate) {
      toast.error("Enter a name, valid amount and due date.");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await updateUpcomingExpense({
          ...editing,
          title: title.trim(),
          amount: n,
          category,
          dueDate,
          essential,
        });
        toast.success("Upcoming expense updated.");
      } else {
        await addUpcomingExpense({ title: title.trim(), amount: n, category, dueDate, essential });
        toast.success("Upcoming expense saved.");
      }
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this expense.");
    } finally {
      setBusy(false);
    }
  };
  const pending = upcomingExpenses.filter((x) => x.status === "planned");
  const pastDue = pending.filter((x) => x.dueDate < APP_TODAY);
  const planned = pending.filter((x) => x.dueDate >= APP_TODAY);
  const pay = async (item: UpcomingExpense) => {
    try {
      await markUpcomingExpensePaid(item.id);
      toast.success("Marked paid and added to transactions once.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark this as paid.");
    }
  };
  const remove = async (item: UpcomingExpense) => {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    try {
      await deleteUpcomingExpense(item.id);
      toast.success("Upcoming expense deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete this expense.");
    }
  };
  return (
    <Page className="min-h-dvh">
      <PageHeader title="Upcoming expenses" left="menu" />
      <p className="mb-4 rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
        Planned costs reduce safe-to-spend until they are paid or cancelled. Marking one paid
        creates its expense transaction and prevents it being counted twice.
      </p>
      <form onSubmit={save} className="mb-5 space-y-3 rounded-3xl bg-card p-4 shadow-soft">
        <h2 className="font-extrabold text-foreground">
          {editing ? "Edit planned expense" : "Add a planned expense"}
        </h2>
        <label className="block text-xs font-semibold">
          Name
          <input
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Rent"
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold">
            Amount (R)
            <input
              required
              min="0.01"
              step="0.01"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold">
            Due date
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm"
            />
          </label>
        </div>
        <label className="block text-xs font-semibold">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryKey)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm"
          >
            {expenseCategories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={essential}
            onChange={(e) => setEssential(e.target.checked)}
          />
          Essential expense
        </label>
        <div className="flex gap-2">
          <button
            disabled={busy}
            className="flex-1 rounded-xl bg-navy p-3 text-sm font-bold text-navy-foreground disabled:opacity-50"
          >
            {busy ? "Saving…" : editing ? "Save changes" : "Add expense"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-border px-4 text-sm font-semibold"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      {[
        { label: "Overdue", items: pastDue },
        { label: "Coming up", items: planned },
        { label: "Paid", items: upcomingExpenses.filter((x) => x.status === "paid") },
      ].map((section) => (
        <section key={section.label} className="mb-5">
          <h2 className="mb-2 text-sm font-extrabold text-foreground">{section.label}</h2>
          {section.items.length === 0 ? (
            <p className="rounded-2xl bg-card p-4 text-xs text-muted-foreground">
              Nothing here yet.
            </p>
          ) : (
            <div className="space-y-2">
              {section.items.map((item) => (
                <div key={item.id} className="rounded-2xl bg-card p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {CATEGORIES.find((c) => c.key === item.category)?.name} · due {item.dueDate}{" "}
                        · {item.essential ? "Essential" : "Flexible"}
                      </p>
                      <p className="mt-2 text-sm font-extrabold text-primary">
                        {fmtR(item.amount)}
                      </p>
                    </div>
                    {item.status === "planned" && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => pay(item)}
                          className="rounded-lg bg-success/10 px-3 py-2 text-xs font-bold text-success"
                        >
                          Mark paid
                        </button>
                        <button
                          onClick={() => edit(item)}
                          className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(item)}
                          className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </Page>
  );
}
