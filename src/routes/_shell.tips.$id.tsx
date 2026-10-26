import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bookmark, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/nav";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import { useApp } from "@/store/app-store";
import { pwHead } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/tips/$id")({
  head: () => pwHead("Tip — PlanWisely", "Financial tip detail."),
  component: TipDetail,
});

const ACCENTS = [
  "bg-gradient-to-br from-primary/80 to-bursary",
  "bg-gradient-to-br from-success/80 to-success",
  "bg-gradient-to-br from-bursary to-primary",
];

function TipDetail() {
  const { id } = Route.useParams() as { id: string };
  const { tips, toggleTipSaved, markTipCompleted } = useApp();
  const tip = tips.find((t) => t.id === id);
  const index = tips.findIndex((t) => t.id === id);

  if (!tip) {
    return (
      <Page className="min-h-dvh">
        <PageHeader title="Tip" backTo="/tips" />
        <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">This tip no longer exists.</p>
        </div>
      </Page>
    );
  }

  const complete = () => {
    void markTipCompleted(tip.id)
      .then(() => toast.success("Tip marked as completed."))
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Could not update tip progress."),
      );
  };
  const toggleSaved = () => {
    void toggleTipSaved(tip.id).catch((error) =>
      toast.error(error instanceof Error ? error.message : "Could not save this tip."),
    );
  };

  return (
    <Page className="min-h-dvh">
      <PageHeader title={tip.title} backTo="/tips" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative flex h-32 items-end overflow-hidden rounded-3xl p-5",
          ACCENTS[Math.max(0, index) % ACCENTS.length],
        )}
      >
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/85">
          {tip.category === "saving"
            ? "Saving"
            : tip.category === "budgeting"
              ? "Budgeting"
              : "Investing"}
        </span>
        <span className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15 blur-lg" />
      </motion.div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-foreground">
          {tip.title}
        </h1>
        <button
          onClick={toggleSaved}
          aria-label={tip.saved ? "Remove from saved" : "Save tip"}
          className={cn("mt-1 shrink-0", tip.saved ? "text-primary" : "text-muted-foreground")}
        >
          <Bookmark size={22} fill={tip.saved ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="mt-4 space-y-4 rounded-2xl bg-card p-5 shadow-soft">
        <p className="text-[15px] font-semibold leading-relaxed text-foreground">{tip.excerpt}</p>
        {tip.body.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </div>

      <div className="mt-5 space-y-2.5">
        {tip.completed ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-success/15 py-3.5 text-sm font-bold text-success">
            <CheckCircle2 size={18} /> Completed — well done!
          </div>
        ) : (
          <PrimaryButton onClick={complete}>Mark as Completed</PrimaryButton>
        )}
        <Link to="/tips">
          <SecondaryButton>Back to all tips</SecondaryButton>
        </Link>
      </div>
    </Page>
  );
}
