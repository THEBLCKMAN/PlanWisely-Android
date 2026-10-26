import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Page, PageHeader } from "@/components/nav";
import { useApp } from "@/store/app-store";
import { APP_TODAY } from "@/data/mock";
import { fmtR, monthName } from "@/lib/format";
import { pwHead } from "@/lib/head";

export const Route = createFileRoute("/_shell/analytics/report")({
  head: () => pwHead("Monthly report — PlanWisely", "Your full monthly money report."),
  component: ReportScreen,
});

function ReportScreen() {
  const { categories, totalsForMonth, spentByCategory } = useApp();
  const [month, setMonth] = useState(APP_TODAY.slice(0, 7));
  const previousMonth = shiftMonth(month, -1);
  const totals = totalsForMonth(month);
  const previousTotals = totalsForMonth(previousMonth);
  const spent = spentByCategory(month);

  const spentEntries = categories
    .map((c) => ({ name: c.name, value: spent[c.key] ?? 0 }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);
  const totalSpent = spentEntries.reduce((s, e) => s + e.value, 0);
  const delta = totals.expenses - previousTotals.expenses;

  return (
    <Page className="min-h-dvh">
      <PageHeader title="Monthly Report" backTo="/analytics" />

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

      <div className="gradient-navy mb-4 rounded-3xl p-5 text-navy-foreground shadow-float">
        <div className="text-xs font-semibold uppercase tracking-wide opacity-75">
          Report · {monthName(`${month}-01`)} {month.slice(0, 4)}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[10px] font-semibold uppercase opacity-70">Income</div>
            <div className="text-base font-extrabold">
              {fmtR(totals.income, { decimals: false })}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase opacity-70">Expenses</div>
            <div className="text-base font-extrabold">
              {fmtR(totals.expenses, { decimals: false })}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase opacity-70">Saved</div>
            <div className="text-base font-extrabold">
              {fmtR(totals.savings, { decimals: false })}
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] font-semibold opacity-85">
          {delta <= 0
            ? `You spent ${fmtR(Math.abs(delta), { decimals: false })} less than ${monthName(`${previousMonth}-01`)} — great control!`
            : `You spent ${fmtR(delta, { decimals: false })} more than ${monthName(`${previousMonth}-01`)} — worth a look.`}
        </p>
      </div>

      <h2 className="mb-3 text-[15px] font-extrabold text-foreground">Where it went</h2>
      <div className="rounded-2xl bg-card p-5 shadow-soft">
        {spentEntries.map((e) => (
          <div
            key={e.name}
            className="flex items-center justify-between border-b border-border/60 py-2.5 last:border-0"
          >
            <span className="text-sm text-muted-foreground">{e.name}</span>
            <span className="text-sm font-bold text-foreground">
              {fmtR(e.value, { decimals: false })}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                ({Math.round((e.value / (totalSpent || 1)) * 100)}%)
              </span>
            </span>
          </div>
        ))}
        <div className="mt-2 flex items-center justify-between border-t-2 border-border pt-3">
          <span className="text-sm font-extrabold text-foreground">Total</span>
          <span className="text-sm font-extrabold text-foreground">
            {fmtR(totalSpent, { decimals: false })}
          </span>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Balance calculated from your recorded transactions: {fmtR(totals.balance)}
      </p>
    </Page>
  );
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
