import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { DonutChart } from "@/components/charts";
import { Page, PageHeader } from "@/components/nav";
import { useApp } from "@/store/app-store";
import { APP_TODAY, CATEGORIES } from "@/data/mock";
import { fmtR, monthName } from "@/lib/format";
import { pwHead } from "@/lib/head";

export const Route = createFileRoute("/_shell/analytics/breakdown")({
  head: () => pwHead("Spending breakdown — PlanWisely", "Where your money went this month."),
  component: BreakdownScreen,
});

const COLORS: Record<string, string> = {
  food: "var(--color-crimson)",
  transport: "var(--color-navy)",
  electricity: "var(--color-bursary)",
  airtime: "var(--color-primary)",
  entertainment: "var(--color-success)",
  other: "var(--color-muted-foreground)",
  bursary: "var(--color-brand-grad-1)",
};

function BreakdownScreen() {
  const { spentByCategory } = useApp();
  const [month, setMonth] = useState(APP_TODAY.slice(0, 7));
  const spent = spentByCategory(month);

  const entries = CATEGORIES.map((c) => ({
    name: c.name,
    value: spent[c.key] ?? 0,
    color: COLORS[c.key],
  }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = entries.reduce((s, e) => s + e.value, 0);

  return (
    <Page className="min-h-dvh">
      <PageHeader title="Spending Breakdown" backTo="/analytics" />

      <div className="mb-4 flex items-center justify-center gap-6">
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

      <div className="mb-5 flex justify-center">
        <DonutChart
          segments={entries.map((e) => ({ label: e.name, value: e.value, color: e.color }))}
          centerLabel={fmtR(total, { decimals: false })}
          centerSub={`spent in ${monthName(`${month}-01`)}`}
          size={170}
        />
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">
          No expenses recorded for this month yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.map((e) => (
            <div
              key={e.name}
              className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft"
            >
              <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: e.color }} />
              <span className="flex-1 text-sm font-bold text-foreground">{e.name}</span>
              <span className="text-right">
                <span className="block text-sm font-extrabold text-foreground">
                  {fmtR(e.value, { decimals: false })}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {Math.round((e.value / (total || 1)) * 100)}%
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
