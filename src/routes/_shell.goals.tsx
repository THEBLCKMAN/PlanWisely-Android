import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CarFront,
  GraduationCap,
  Handshake,
  House,
  Lock,
  PiggyBank,
  Plane,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Target,
  TrendingUp,
} from "lucide-react";
import { Page, PageHeader } from "@/components/nav";
import {
  Field,
  PrimaryButton,
  ProgressBar,
  SecondaryButton,
  SegmentedTabs,
  SelectField,
  Sheet,
} from "@/components/ui";
import { useApp } from "@/store/app-store";
import { fmtR } from "@/lib/format";
import { pwHead } from "@/lib/head";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SavingsGoal, SavingsGoalCategory } from "@/data/types";

export const Route = createFileRoute("/_shell/goals")({
  head: () => pwHead("Goals — PlanWisely", "Track your level, XP and badges."),
  component: GoalsScreen,
});

const BADGE_ICONS = {
  target: Target,
  piggy: PiggyBank,
  handshake: Handshake,
  trending: TrendingUp,
} as const;

const GOAL_ICONS = {
  emergency: ShieldCheck,
  travel: Plane,
  car: CarFront,
  education: GraduationCap,
  home: House,
  shopping: ShoppingBag,
  general: PiggyBank,
} as const;

const GOAL_CATEGORIES: { value: SavingsGoalCategory; label: string }[] = [
  { value: "emergency", label: "Emergency Fund" },
  { value: "travel", label: "Travel" },
  { value: "car", label: "Car" },
  { value: "education", label: "Education" },
  { value: "home", label: "Home" },
  { value: "shopping", label: "Shopping" },
  { value: "general", label: "General Savings" },
];

function GoalsScreen() {
  const {
    badges,
    xpTotal,
    challenges,
    savingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    addSavingsContribution,
    deleteSavingsGoal,
  } = useApp();
  const [tab, setTab] = useState("All");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<SavingsGoalCategory>("general");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [contributionAmounts, setContributionAmounts] = useState<Record<string, string>>({});

  const filtered = badges.filter((b) =>
    tab === "All" ? true : tab === "Earned" ? b.earned : !b.earned,
  );

  const openGoal = (goal?: SavingsGoal) => {
    setEditing(goal ?? null);
    setName(goal?.name ?? "");
    setCategory(goal?.category ?? "general");
    setTarget(goal ? String(goal.targetAmount) : "");
    setTargetDate(goal?.targetDate ?? "");
    setSheetOpen(true);
  };

  const saveGoal = async () => {
    const amount = Number(target);
    if (!name.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a goal name and a target amount above R0.");
      return;
    }
    try {
      if (editing) {
        await updateSavingsGoal({
          ...editing,
          name: name.trim(),
          category,
          targetAmount: amount,
          targetDate: targetDate || undefined,
          savedAmount: Math.min(editing.savedAmount, amount),
        });
        toast.success("Savings goal updated.");
      } else {
        await addSavingsGoal({
          name: name.trim(),
          category,
          targetAmount: amount,
          targetDate: targetDate || undefined,
        });
        toast.success("Savings goal added.");
      }
      setSheetOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this goal.");
    }
  };

  const contribute = async (goal: SavingsGoal) => {
    const amount = Number(contributionAmounts[goal.id]);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a contribution above R0.");
      return;
    }
    try {
      await addSavingsContribution(goal.id, amount);
      setContributionAmounts((prev) => ({ ...prev, [goal.id]: "" }));
      toast.success("Contribution added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add this contribution.");
    }
  };

  return (
    <Page className="min-h-dvh">
      <PageHeader title="Financial Goals" left="menu" />

      <div className="rounded-3xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
        Create savings goals and record contributions to track your progress.
      </div>

      <div className="my-4 flex items-center justify-between rounded-2xl bg-navy p-4 text-navy-foreground">
        <div>
          <p className="text-xs font-semibold opacity-75">Challenge XP</p>
          <p className="text-2xl font-extrabold">{xpTotal} XP</p>
        </div>
        <Link to="/challenges" className="rounded-xl bg-white/15 px-3 py-2 text-xs font-bold">
          View challenges · {challenges.filter((c) => c.status === "accepted").length} active
        </Link>
      </div>

      <div className="mb-3 mt-5 flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-extrabold text-foreground">Savings Goals</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Track your savings goals in your account.
          </p>
        </div>
        <button
          onClick={() => openGoal()}
          className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-soft"
          aria-label="Create savings goal"
        >
          <Plus size={16} /> Add goal
        </button>
      </div>

      {savingsGoals.length === 0 ? (
        <div className="mb-5 rounded-2xl border border-dashed border-border bg-card p-5 text-center shadow-soft">
          <PiggyBank className="mx-auto text-primary" size={28} />
          <p className="mt-2 text-sm font-bold text-foreground">Start with a savings goal</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a target, then record contributions as you save.
          </p>
        </div>
      ) : (
        <div className="mb-5 space-y-3">
          {savingsGoals.map((goal) => {
            const Icon = GOAL_ICONS[goal.category] ?? PiggyBank;
            const progress = Math.min(
              100,
              Math.round((goal.savedAmount / goal.targetAmount) * 100),
            );
            return (
              <div key={goal.id} className="rounded-2xl bg-card p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon size={23} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-foreground">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {GOAL_CATEGORIES.find((item) => item.value === goal.category)?.label}
                    </p>
                  </div>
                  <button
                    onClick={() => openGoal(goal)}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-primary"
                    aria-label={`Edit ${goal.name}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete the “${goal.name}” savings goal?`))
                        void deleteSavingsGoal(goal.id)
                          .then(() => toast.success("Savings goal deleted."))
                          .catch((error) =>
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Could not delete this goal.",
                            ),
                          );
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-destructive"
                    aria-label={`Delete ${goal.name}`}
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold">
                  <span className="text-foreground">
                    R{goal.savedAmount.toLocaleString("en-ZA")} saved
                  </span>
                  <span className="text-muted-foreground">
                    of R{goal.targetAmount.toLocaleString("en-ZA")}
                  </span>
                </div>
                <ProgressBar value={progress} className="mt-2" />
                <div className="mt-3 flex gap-2">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={contributionAmounts[goal.id] ?? ""}
                    onChange={(event) =>
                      setContributionAmounts((prev) => ({ ...prev, [goal.id]: event.target.value }))
                    }
                    aria-label={`Contribution for ${goal.name}`}
                    placeholder="Contribution (R)"
                    className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => contribute(goal)}
                    className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-navy-foreground"
                  >
                    Add
                  </button>
                </div>
                {goal.targetDate && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Target date: {goal.targetDate}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="my-4">
        <SegmentedTabs tabs={["All", "Earned", "Locked"]} active={tab} onChange={setTab} />
      </div>

      <div className="space-y-3">
        {filtered.map((badge, i) => {
          const Icon = BADGE_ICONS[badge.icon];
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "flex items-center gap-4 rounded-2xl bg-card p-4 shadow-soft",
                !badge.earned && "opacity-80",
              )}
            >
              <span
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                  badge.earned ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {badge.earned ? <Icon size={24} /> : <Lock size={20} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-extrabold text-foreground">{badge.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                      badge.earned
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {badge.earned ? "Earned" : "Locked"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{badge.description}</div>
                <div className="mt-1 text-[11px] font-semibold text-muted-foreground/80">
                  Requirement: {badge.requirement}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        XP is awarded when the server verifies that a savings challenge has been completed.
      </p>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? "Edit savings goal" : "Create savings goal"}
      >
        <div className="space-y-3">
          <Field
            label="Goal name"
            value={name}
            onChange={setName}
            placeholder="e.g. Emergency fund"
          />
          <SelectField
            label="Category"
            value={category}
            onChange={(value) => setCategory(value as SavingsGoalCategory)}
            options={GOAL_CATEGORIES}
            placeholder="Choose a category"
          />
          <Field
            label="Target amount (R)"
            value={target}
            onChange={setTarget}
            placeholder="5000"
            type="number"
          />
          <Field
            label="Target date (optional)"
            value={targetDate}
            onChange={setTargetDate}
            type="date"
          />
          <PrimaryButton onClick={saveGoal}>
            {editing ? "Save changes" : "Create goal"}
          </PrimaryButton>
          <SecondaryButton onClick={() => setSheetOpen(false)}>Cancel</SecondaryButton>
          <p className="text-center text-[11px] text-muted-foreground">
            Demo data is stored in memory and clears when you refresh.
          </p>
        </div>
      </Sheet>
    </Page>
  );
}
