import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Moon, ShieldCheck, Sparkles, Download, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/nav";
import { pwHead } from "@/lib/head";
import { useApp } from "@/store/app-store";
import { getSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/_shell/settings")({
  head: () => pwHead("Settings — PlanWisely", "Manage notifications and your personal data."),
  component: SettingsPage,
});
type LocalPreferences = { darkMode: boolean };
const STORAGE_KEY = "planwisely.preferences.v2";
function readLocal(): LocalPreferences {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as LocalPreferences;
  } catch {
    return { darkMode: false };
  }
}

function SettingsPage() {
  const { user, userId, updateUser, setWiseyConsent } = useApp();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const p = readLocal();
    setDarkMode(Boolean(p.darkMode));
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ darkMode }));
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);
  const setNotification = async (
    key: "spendingAlertsEnabled" | "weeklySummaryEnabled",
    value: boolean,
  ) => {
    setBusy(true);
    try {
      await updateUser({ [key]: value });
      toast.success("Notification preference saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the preference.");
    } finally {
      setBusy(false);
    }
  };
  const changeWiseyConsent = async (enabled: boolean) => {
    setBusy(true);
    try {
      await setWiseyConsent(enabled);
      toast.success(enabled ? "Wisey AI consent saved." : "Wisey AI consent withdrawn.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update Wisey consent.");
    } finally {
      setBusy(false);
    }
  };
  const exportData = async () => {
    setBusy(true);
    try {
      const db = getSupabase();
      const results = await Promise.all([
        db
          .from("profiles")
          .select(
            "full_name,phone,university,student_number,study_year,nsfas_recipient,birth_date,budget_period_start,next_payment_date,opening_balance,created_at",
          )
          .eq("id", userId)
          .maybeSingle(),
        db.from("transactions").select("*").eq("user_id", userId),
        db.from("budgets").select("*").eq("user_id", userId),
        db.from("upcoming_expenses").select("*").eq("user_id", userId),
        db.from("savings_goals").select("*").eq("user_id", userId),
        db.from("goal_contributions").select("*").eq("user_id", userId),
        db.from("notifications").select("*").eq("user_id", userId),
        db.from("health_score_history").select("*").eq("user_id", userId),
        db.from("login_streaks").select("*").eq("user_id", userId),
        db.from("savings_challenges").select("*").eq("user_id", userId),
        db
          .from("support_requests")
          .select("id,message,status,created_at,updated_at,admin_reply")
          .eq("user_id", userId),
        db.from("chat_sessions").select("*,chat_messages(*)").eq("user_id", userId),
      ]);
      const error = results.find((x) => x.error)?.error;
      if (error) throw error;
      const payload = {
        exportedAt: new Date().toISOString(),
        account: { id: userId, name: user.name, email: user.email },
        profile: results[0].data,
        transactions: results[1].data,
        budgets: results[2].data,
        upcomingExpenses: results[3].data,
        savingsGoals: results[4].data,
        goalContributions: results[5].data,
        notifications: results[6].data,
        healthScores: results[7].data,
        streaks: results[8].data,
        challenges: results[9].data,
        supportRequests: results[10].data,
        wiseyConversations: results[11].data,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `planwisely-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data export has been downloaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not export your data.");
    } finally {
      setBusy(false);
    }
  };
  const deleteAccount = async () => {
    if (
      !window.confirm(
        "Permanently delete your PlanWisely account and associated records? This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    try {
      const { data, error } = await getSupabase().functions.invoke("delete-account", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await getSupabase().auth.signOut();
      toast.success("Your account has been deleted.");
      await navigate({ to: "/login", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete your account.");
    } finally {
      setBusy(false);
    }
  };
  const rows = [
    {
      title: "Dark appearance",
      description: "Use a darker colour theme",
      icon: Moon,
      value: darkMode,
      onChange: () => setDarkMode((v) => !v),
    },
    {
      title: "Spending alerts",
      description: "Receive budget and goal notifications",
      icon: Bell,
      value: user.spendingAlertsEnabled !== false,
      onChange: () =>
        void setNotification("spendingAlertsEnabled", user.spendingAlertsEnabled === false),
    },
    {
      title: "Weekly summary",
      description: "Receive a spending review and tip each Sunday",
      icon: Sparkles,
      value: user.weeklySummaryEnabled !== false,
      onChange: () =>
        void setNotification("weeklySummaryEnabled", user.weeklySummaryEnabled === false),
    },
  ];
  return (
    <Page className="min-h-dvh">
      <PageHeader title="Settings" left="menu" />
      <div className="mb-5 rounded-3xl bg-card p-4 shadow-soft">
        <p className="mb-3 px-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          Preferences
        </p>
        <div className="divide-y divide-border">
          {rows.map(({ title, description, icon: Icon, value, onChange }) => (
            <div key={title} className="flex items-center gap-3 py-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={value}
                aria-label={title}
                disabled={busy}
                onClick={onChange}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"} disabled:opacity-50`}
              >
                <span
                  className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-5 rounded-3xl bg-card p-4 shadow-soft">
        <p className="mb-3 px-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          Account and privacy
        </p>
        <p className="px-1 pb-3 text-xs leading-relaxed text-muted-foreground">
          Your profile and financial records are stored under your account. You can download a copy
          or permanently delete your account and linked records.
        </p>
        <button
          disabled={busy}
          onClick={() => void exportData()}
          className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left text-sm font-bold text-foreground disabled:opacity-50"
        >
          <Download size={18} className="text-primary" />
          Download my data
        </button>
        <button
          disabled={busy}
          onClick={() => void deleteAccount()}
          className="flex w-full items-center gap-3 rounded-2xl border border-destructive/30 p-3 text-left text-sm font-bold text-destructive disabled:opacity-50"
        >
          <Trash2 size={18} />
          Delete account and data
        </button>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-success/10 p-3 text-xs text-success">
          <ShieldCheck size={17} />
          No bank passwords or card numbers are requested.
        </div>
      </div>
      <div className="mb-5 rounded-3xl bg-card p-4 shadow-soft">
        <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          Wisey AI data sharing
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {user.wiseyAiConsentAt
            ? "You have allowed Wisey to send your questions and limited financial summary to the configured AI provider."
            : "Wisey AI is off until you opt in. Without this consent, the external AI provider will not receive your question or financial summary."}
        </p>
        <button
          disabled={busy}
          onClick={() => void changeWiseyConsent(!user.wiseyAiConsentAt)}
          className={`mt-3 w-full rounded-xl p-3 text-sm font-bold ${user.wiseyAiConsentAt ? "border border-border text-foreground" : "bg-primary text-primary-foreground"}`}
        >
          {user.wiseyAiConsentAt ? "Withdraw Wisey AI consent" : "Allow Wisey AI data sharing"}
        </button>
      </div>
      <p className="px-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        Investment content is educational, not personal financial advice. Dark appearance is saved
        on this device; notification preferences are saved to your account.{" "}
        <Link to="/privacy" className="font-bold text-primary underline">
          Privacy notice
        </Link>
        .
      </p>
    </Page>
  );
}
