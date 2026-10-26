/** Format a rand amount: 43890 -> "R43,890.00" */
export function fmtR(amount: number, opts?: { decimals?: boolean }): string {
  const decimals = opts?.decimals ?? true;
  return (
    "R" +
    amount.toLocaleString("en-ZA", {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    })
  );
}

/** Signed short format for rows: -R900 / +R10,000 */
export function fmtSigned(amount: number, type: "income" | "expense"): string {
  const sign = type === "income" ? "+" : "-";
  return sign + fmtR(amount, { decimals: false });
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthName(date: string): string {
  return MONTHS[new Date(date).getMonth()];
}

export function dayLabel(date: string, today = new Date("2026-05-28")): string {
  const d = new Date(date);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export function monthLabel(index: number): string {
  return MONTHS[((index % 12) + 12) % 12];
}
