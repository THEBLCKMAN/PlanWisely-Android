import { createFileRoute, Link } from "@tanstack/react-router";
import { Page, PageHeader } from "@/components/nav";
import { pwHead } from "@/lib/head";

export const Route = createFileRoute("/privacy")({
  head: () =>
    pwHead(
      "Privacy notice — PlanWisely",
      "How PlanWisely uses your account and financial information.",
    ),
  component: PrivacyNotice,
});

function PrivacyNotice() {
  return (
    <Page className="min-h-dvh">
      <PageHeader title="Privacy notice" backTo="/register" />
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <section className="rounded-2xl bg-card p-5 shadow-soft">
          <h2 className="font-extrabold text-foreground">Information the app stores</h2>
          <p className="mt-2">
            PlanWisely stores the profile details you enter, transactions, budgets, planned
            expenses, savings goals, support messages, notifications, and Wisey conversation history
            in the connected Supabase project. Profile photos are stored in that project’s private
            storage. The app does not request bank passwords or card numbers.
          </p>
        </section>
        <section className="rounded-2xl bg-card p-5 shadow-soft">
          <h2 className="font-extrabold text-foreground">Wisey and external AI services</h2>
          <p className="mt-2">
            If you use Wisey, the app sends your question and a limited summary of your own recorded
            finances to the AI provider configured by the PlanWisely operator. The summary is used
            to answer that question; provider terms and retention settings apply. Chat messages are
            also saved in your PlanWisely account so you can review conversation history. Do not
            include information you do not want processed by that provider.
          </p>
        </section>
        <section className="rounded-2xl bg-card p-5 shadow-soft">
          <h2 className="font-extrabold text-foreground">Your controls</h2>
          <p className="mt-2">
            You can export your account data or request account deletion in Settings. You can turn
            off spending alerts and weekly summaries there. Contact support from Help &amp; Support
            for questions about your information.
          </p>
        </section>
        <section className="rounded-2xl bg-card p-5 shadow-soft">
          <h2 className="font-extrabold text-foreground">Under 18</h2>
          <p className="mt-2">
            The sign-up form records a guardian-consent declaration and contact email. It does not
            independently verify a guardian’s identity or consent. The service operator must
            configure a guardian confirmation process before relying on this declaration for
            production accounts.
          </p>
        </section>
        <p className="px-2 text-xs">
          Notice version 2026-10-v1. For questions or to request help, use{" "}
          <Link to="/help" className="font-bold text-primary">
            Help &amp; Support
          </Link>{" "}
          after signing in.
        </p>
      </div>
    </Page>
  );
}
