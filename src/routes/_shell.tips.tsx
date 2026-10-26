import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bookmark, PiggyBank, Search, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/nav";
import { Chip, SegmentedTabs } from "@/components/ui";
import { useApp } from "@/store/app-store";
import { pwHead } from "@/lib/head";
import { cn } from "@/lib/utils";
import type { TipCategory } from "@/data/types";

export const Route = createFileRoute("/_shell/tips")({
  head: () => pwHead("Financial Tips — PlanWisely", "Short, practical money lessons for students."),
  component: TipsScreen,
});

const CATEGORY_LABELS: Record<TipCategory, string> = {
  saving: "Saving",
  budgeting: "Budgeting",
  investing: "Investing",
};

const ACCENTS = [
  "bg-gradient-to-br from-primary/80 to-bursary",
  "bg-gradient-to-br from-success/80 to-success",
  "bg-gradient-to-br from-bursary to-primary",
];
const TIP_ICONS = { saving: PiggyBank, budgeting: Wallet, investing: TrendingUp } as const;

function TipsScreen() {
  const { tips, toggleTipSaved } = useApp();
  const [cat, setCat] = useState<"All" | TipCategory>("All");
  const [view, setView] = useState("All");
  const [query, setQuery] = useState("");
  const toggleSaved = async (id: string) => {
    try {
      await toggleTipSaved(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this tip.");
    }
  };

  const filtered = tips
    .filter((t) => (cat === "All" ? true : t.category === cat))
    .filter((t) => (view === "All" ? true : view === "Saved" ? t.saved : t.completed))
    .filter((t) => (t.title + t.excerpt).toLowerCase().includes(query.toLowerCase()));

  return (
    <Page className="min-h-dvh">
      <PageHeader title="Financial Tips" left="menu" />

      <div className="mb-3 flex items-center gap-2 rounded-full bg-card px-4 py-3 shadow-soft">
        <Search size={16} className="text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tips…"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
        {(["All", "saving", "budgeting", "investing"] as const).map((c) => (
          <Chip
            key={c}
            label={c === "All" ? "All" : CATEGORY_LABELS[c]}
            active={cat === c}
            onClick={() => setCat(c)}
          />
        ))}
      </div>

      <div className="mb-4">
        <SegmentedTabs tabs={["All", "Saved", "Completed"]} active={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">No tips here yet — try another filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tip, i) => (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-3 rounded-2xl bg-card p-4 shadow-soft"
            >
              <Link
                to="/tips/$id"
                params={{ id: tip.id }}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span
                  className={cn(
                    "flex h-16 w-12 shrink-0 items-center justify-center rounded-xl text-white",
                    ACCENTS[i % ACCENTS.length],
                  )}
                >
                  {(() => {
                    const Icon = TIP_ICONS[tip.category];
                    return <Icon size={23} aria-hidden="true" />;
                  })()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-extrabold text-foreground">
                    {tip.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                    {tip.excerpt}
                  </span>
                  <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {CATEGORY_LABELS[tip.category]}
                  </span>
                </span>
              </Link>
              <button
                onClick={() => void toggleSaved(tip.id)}
                aria-label={tip.saved ? "Remove from saved" : "Save tip"}
                className={cn(
                  "mt-1 h-8 w-8 shrink-0",
                  tip.saved ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Bookmark size={18} fill={tip.saved ? "currentColor" : "none"} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </Page>
  );
}
