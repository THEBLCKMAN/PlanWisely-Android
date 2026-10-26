import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/nav";
import { useApp } from "@/store/app-store";
import { getSupabase } from "@/lib/supabase";
import { fmtR } from "@/lib/format";
import { pwHead } from "@/lib/head";
import { CATEGORIES } from "@/data/mock";

export const Route = createFileRoute("/_shell/challenges")({
  head: () =>
    pwHead("Savings challenges — PlanWisely", "Small personal steps to build a saving habit."),
  component: SavingsChallengesPage,
});

function SavingsChallengesPage() {
  const { challenges, decideChallenge, transactions, reloadData } = useApp();
  const [busy, setBusy] = useState(false);
  const generate = async () => {
    setBusy(true);
    try {
      const { data, error } = await getSupabase().functions.invoke("challenge-suggest", {
        body: {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await reloadData();
      toast.success("A personal savings challenge is ready.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not create a challenge. Try again later.",
      );
    } finally {
      setBusy(false);
    }
  };
  const choice = async (id: string, accept: boolean) => {
    try {
      await decideChallenge(id, accept);
      toast.success(accept ? "Challenge accepted. You’ve got this!" : "Challenge declined.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the challenge.");
    }
  };
  const active = challenges.filter((c) => c.status === "offered" || c.status === "accepted");
  return (
    <Page className="min-h-dvh">
      <PageHeader title="Savings challenges" left="menu" />
      <div className="mb-4 rounded-3xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
        Wisey uses your recorded expenses to suggest one achievable step. XP is awarded only after
        server-side progress checks.
      </div>
      <button
        disabled={busy || transactions.length === 0}
        onClick={generate}
        className="mb-5 w-full rounded-2xl bg-navy p-3 font-bold text-navy-foreground disabled:opacity-50"
      >
        {busy ? "Creating challenge…" : "Suggest a challenge from my spending"}
      </button>
      {transactions.length === 0 && (
        <p className="mb-4 text-xs text-muted-foreground">
          Record a few expenses first so the challenge can be based on your spending.
        </p>
      )}
      {active.length === 0 ? (
        <div className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground">
          No active challenges. Use the button above after recording expenses.
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((c) => (
            <article key={c.id} className="rounded-3xl bg-card p-5 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                {CATEGORIES.find((x) => x.key === c.category)?.name} · {c.status}
              </p>
              <h2 className="mt-2 text-lg font-extrabold text-foreground">{c.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                Usual spend: {fmtR(c.baselineAmount)} · Target reduction: {c.targetReductionPercent}
                % · Ends: {c.endsOn}
              </p>
              {c.status === "offered" && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => choice(c.id, true)}
                    className="flex-1 rounded-xl bg-primary p-3 text-sm font-bold text-primary-foreground"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => choice(c.id, false)}
                    className="rounded-xl border border-border px-4 text-sm font-semibold"
                  >
                    Decline
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {challenges.some((c) => c.status === "completed") && (
        <section className="mt-6">
          <h2 className="mb-2 font-extrabold">Completed challenges</h2>
          <div className="space-y-2">
            {challenges
              .filter((c) => c.status === "completed")
              .map((c) => (
                <div key={c.id} className="rounded-2xl bg-success/10 p-4">
                  <p className="font-bold">{c.title}</p>
                  <p className="text-xs">Completed · {c.xpAwarded} XP</p>
                </div>
              ))}
          </div>
        </section>
      )}
    </Page>
  );
}
