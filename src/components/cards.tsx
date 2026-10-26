import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bus,
  Clapperboard,
  CreditCard,
  GraduationCap,
  Lightbulb,
  Package,
  Smartphone,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "@/store/app-store";
import { dayLabel, fmtR, fmtSigned, monthLabel } from "@/lib/format";
import { APP_TODAY } from "@/data/mock";
import type { CategoryKey, Transaction } from "@/data/types";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui";
import { Link } from "@tanstack/react-router";

/* ---------- Category helpers ---------- */

const CATEGORY_ICONS: Partial<Record<CategoryKey, ReactNode>> = {
  food: <UtensilsCrossed size={18} />,
  transport: <Bus size={18} />,
  bursary: <GraduationCap size={18} />,
  electricity: <Zap size={18} />,
  airtime: <Smartphone size={18} />,
  entertainment: <Clapperboard size={18} />,
  other: <Package size={18} />,
  rent: <Wallet size={18} />,
};

const CATEGORY_SOFT: Partial<Record<CategoryKey, string>> = {
  food: "bg-crimson/10 text-crimson",
  transport: "bg-navy/10 text-navy",
  bursary: "bg-bursary/10 text-bursary",
  electricity: "bg-navy/10 text-navy",
  airtime: "bg-primary/10 text-primary",
  entertainment: "bg-success/15 text-success",
  other: "bg-muted text-muted-foreground",
  rent: "bg-navy/10 text-navy",
};

export function CategoryIcon({ category }: { category: CategoryKey }) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
        CATEGORY_SOFT[category] ?? "bg-muted text-muted-foreground",
      )}
    >
      {CATEGORY_ICONS[category] ?? <Package size={18} />}
    </span>
  );
}

/** Gradient banner matching the Figma category headers (red / navy / blue). */
export function CategoryBanner({
  name,
  banner,
  className,
}: {
  name: string;
  banner?: "food" | "transport" | "bursary" | "electricity";
  className?: string;
}) {
  const styles: Record<string, string> = {
    food: "bg-gradient-to-br from-crimson to-crimson/80",
    transport: "bg-gradient-to-br from-navy to-navy/85",
    bursary: "bg-gradient-to-br from-bursary to-bursary/80",
    electricity: "bg-gradient-to-br from-navy to-navy/85",
  };
  return (
    <div
      className={cn(
        "relative flex items-center justify-between overflow-hidden rounded-2xl px-5 py-4 text-navy-foreground shadow-card",
        styles[banner ?? "bursary"],
        className,
      )}
    >
      <span className="text-xl font-extrabold tracking-tight">{name}</span>
      <span className="opacity-30">{CATEGORY_ICONS[(banner ?? "bursary") as CategoryKey]}</span>
      <span className="absolute -right-4 -top-6 h-16 w-16 rounded-full bg-white/10" />
      <span className="absolute -bottom-8 right-8 h-14 w-14 rounded-full bg-white/5" />
    </div>
  );
}

/* ---------- Balance card ---------- */

export function BalanceCard({
  balance,
  income,
  expenses,
  monthIndex = new Date().getMonth(),
}: {
  balance: number;
  income: number;
  expenses: number;
  monthIndex?: number;
}) {
  return (
    <div className="gradient-brand relative overflow-hidden rounded-3xl p-5 text-navy-foreground shadow-float">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-semibold opacity-90">Total Balance</span>
        <span className="flex items-center gap-1.5 opacity-80">
          <CreditCard size={14} /> From your records
        </span>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mt-1 text-[34px] font-extrabold leading-tight tracking-tight"
      >
        {fmtR(balance)}
      </motion.div>
      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
        <ArrowUpRight size={12} /> Calculated from your entries
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide opacity-75">
            Total income · {monthLabel(monthIndex)}
          </div>
          <div className="mt-0.5 text-lg font-bold">{fmtR(income, { decimals: false })}</div>
          <div className="flex items-center gap-1 text-[11px] font-semibold opacity-90">
            <ArrowUpRight size={11} /> Recorded income
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide opacity-75">
            Total expenses · {monthLabel(monthIndex)}
          </div>
          <div className="mt-0.5 text-lg font-bold">{fmtR(expenses, { decimals: false })}</div>
          <div className="flex items-center gap-1 text-[11px] font-semibold opacity-90">
            <ArrowDownRight size={11} /> Recorded expenses
          </div>
        </div>
      </div>
      <span className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <span className="absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-white/10 blur-xl" />
    </div>
  );
}

/* ---------- Transaction row ---------- */

export function TransactionRow({ tx, onClick }: { tx: Transaction; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={onClick ? `Open transaction: ${tx.title}` : undefined}
      className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-soft transition active:scale-[0.99]"
    >
      <CategoryIcon category={tx.category} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-foreground">{tx.title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {tx.note ??
            (tx.type === "income" && tx.incomeSource
              ? {
                  allowance: "Allowance",
                  bursary_nsfas: "Bursary / NSFAS",
                  part_time_work: "Part-time work",
                  family_support: "Family support",
                  other: "Other",
                }[tx.incomeSource]
              : tx.category)}
        </span>
      </span>
      <span className="text-right">
        <span
          className={cn(
            "block text-[15px] font-extrabold",
            tx.type === "income" ? "text-success" : "text-foreground",
          )}
        >
          {fmtSigned(tx.amount, tx.type)}
        </span>
        <span className="block text-xs text-muted-foreground">{dayLabel(tx.date)}</span>
      </span>
    </button>
  );
}

/* ---------- Insight banner ---------- */

export function InsightBanner({ text }: { text: string }) {
  return (
    <div className="gradient-navy relative overflow-hidden rounded-2xl p-4 text-navy-foreground shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-warning">
          <Lightbulb size={18} />
        </span>
        <div>
          <div className="text-sm font-extrabold">Insights</div>
          <div className="text-xs opacity-85">{text}</div>
        </div>
      </div>
      <span className="absolute -right-6 -top-8 h-20 w-20 rounded-full bg-white/5" />
    </div>
  );
}

/* ---------- Stat card ---------- */

export function StatCard({
  label,
  amount,
  direction,
  className,
}: {
  label: string;
  amount: number;
  direction: "up" | "down";
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-card p-4 shadow-soft", className)}>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-extrabold tracking-tight text-foreground">
        {fmtR(amount, { decimals: false })}
      </div>
    </div>
  );
}

/* ---------- Financial health score card ---------- */

export function ScoreRing({
  score,
  size = 96,
  stroke = 9,
  track = "rgba(255,255,255,0.25)",
  className,
}: {
  score: number;
  size?: number;
  stroke?: number;
  track?: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="white"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold">{score}</span>
        <span className="text-[10px] opacity-75">/100</span>
      </div>
    </div>
  );
}

export function HealthScoreCard({ score, grade }: { score: number; grade: string }) {
  return (
    <div className="gradient-brand relative flex items-center justify-between overflow-hidden rounded-3xl p-5 text-navy-foreground shadow-float">
      <ScoreRing score={score} />
      <div className="pr-2 text-right">
        <div className="text-sm font-semibold opacity-85">Financial Health Score</div>
        <div className="text-2xl font-extrabold tracking-tight">{grade}</div>
      </div>
      <span className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-xl" />
    </div>
  );
}

/* ---------- Budget category card ---------- */

export function BudgetCategoryCard({
  name,
  spent,
  budget,
  category,
  banner,
  onClick,
}: {
  name: string;
  spent: number;
  budget: number;
  category: CategoryKey;
  banner?: "food" | "transport" | "bursary" | "electricity";
  onClick?: () => void;
}) {
  const pct = budget === 0 ? 0 : Math.round((spent / budget) * 100);
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl bg-card p-4 text-left shadow-soft transition active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <CategoryIcon category={category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-bold text-foreground">{name}</span>
            <span
              className={cn(
                "text-[13px] font-extrabold",
                pct >= 100 ? "text-destructive" : "text-foreground",
              )}
            >
              {fmtR(spent, { decimals: false })}
              <span className="font-medium text-muted-foreground">
                {" "}
                / {fmtR(budget, { decimals: false })}
              </span>
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar value={pct} />
          </div>
          <div
            className={cn(
              "mt-1.5 text-[11px] font-semibold",
              pct >= 80 ? "text-warning" : "text-muted-foreground",
            )}
          >
            {pct >= 100
              ? "Over budget this month"
              : pct >= 80
                ? `Careful — ${pct}% of budget used`
                : `${pct}% of budget used`}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ---------- "Need assistance?" Wisey shortcut ---------- */

export function WiseyShortcut() {
  const { wiseyBotUrl } = useAssetUrls();
  return (
    <div className="flex justify-end pr-1">
      <Link to="/wisey" className="flex flex-col items-center">
        <motion.img
          src={wiseyBotUrl}
          alt="Wisey assistant"
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="h-16 w-16 object-contain drop-shadow-lg"
        />
        <span className="-mt-1 text-[11px] font-bold text-foreground">Need Assistance?</span>
      </Link>
    </div>
  );
}

/* ---------- Asset URLs (CDN pointers) ---------- */

import logoAssetSrc from "@/assets/logo.png";
const logoAsset = { url: logoAssetSrc };
import wiseyAssetSrc from "@/assets/wisey-bot.png";
const wiseyAsset = { url: wiseyAssetSrc };

export function useAssetUrls() {
  return { logoUrl: logoAsset.url, wiseyBotUrl: wiseyAsset.url };
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  const { logoUrl } = useAssetUrls();
  return (
    <img
      src={logoUrl}
      alt="Planwisely — plan your future, plan wisely"
      className={cn("object-contain", className)}
      style={light ? { filter: "brightness(0) invert(1)" } : undefined}
    />
  );
}

export function WiseyBot({ className }: { className?: string }) {
  const { wiseyBotUrl } = useAssetUrls();
  return <img src={wiseyBotUrl} alt="Wisey" className={cn("object-contain", className)} />;
}

/* Re-export so screens can pull a single module */
export { Wallet as WalletIcon, TrendingUp as TrendingIcon };
