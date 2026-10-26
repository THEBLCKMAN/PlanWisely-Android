import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  CheckCheck,
  CircleDollarSign,
  Lightbulb,
  Trophy,
  CalendarClock,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/nav";
import { pwHead } from "@/lib/head";
import { useApp } from "@/store/app-store";

export const Route = createFileRoute("/_shell/notifications")({
  head: () => pwHead("Notifications — PlanWisely", "Your money updates and reminders."),
  component: NotificationsPage,
});
const icons: Record<string, typeof Bell> = {
  budget: CircleDollarSign,
  upcoming: CalendarClock,
  pace: ShieldAlert,
  quiet: Bell,
  goal: Trophy,
  weekly_summary: CircleDollarSign,
  tip: Lightbulb,
  streak: Trophy,
  challenge: Trophy,
  system: Bell,
};
const tones: Record<string, string> = {
  budget: "bg-warning/20 text-amber-700",
  upcoming: "bg-warning/20 text-amber-700",
  pace: "bg-destructive/10 text-destructive",
  quiet: "bg-primary/10 text-primary",
  goal: "bg-success/15 text-success",
  weekly_summary: "bg-primary/10 text-primary",
  tip: "bg-primary/10 text-primary",
  streak: "bg-success/15 text-success",
  challenge: "bg-success/15 text-success",
  system: "bg-muted text-foreground",
};
function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [busy, setBusy] = useState(false);
  const unread = notifications.filter((n) => !n.readAt).length;
  const markAll = async () => {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      toast.success("All notifications marked as read.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update notifications.");
    } finally {
      setBusy(false);
    }
  };
  const mark = async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update notification.");
    }
  };
  return (
    <Page className="min-h-dvh">
      <PageHeader
        title="Notifications"
        left="menu"
        right={
          <button
            disabled={!unread || busy}
            onClick={() => void markAll()}
            aria-label="Mark all as read"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-primary shadow-soft disabled:opacity-40"
          >
            <CheckCheck size={18} />
          </button>
        }
      />
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-primary/8 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Bell size={17} className="text-primary" />
          Your updates
        </div>
        <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-extrabold text-white">
          {unread} new
        </span>
      </div>
      {notifications.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
          <p className="font-bold text-foreground">No notifications yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Budget alerts and reminders will appear here after the Wisey agent is enabled.
          </p>
          <Link to="/settings" className="mt-3 inline-block text-sm font-bold text-primary">
            Notification settings
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = icons[n.category] || Bell;
            const destinations = [
              "/budget",
              "/upcoming",
              "/dashboard",
              "/goals",
              "/analytics/report",
              "/transactions",
              "/tips",
              "/challenges",
            ] as const;
            const actionTo = destinations.includes(n.actionPath as (typeof destinations)[number])
              ? (n.actionPath as (typeof destinations)[number])
              : undefined;
            return (
              <article
                key={n.id}
                className={`rounded-3xl bg-card p-4 shadow-soft ${!n.readAt ? "ring-1 ring-primary/15" : "opacity-80"}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tones[n.category] || "bg-muted"}`}
                  >
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-sm font-extrabold text-foreground">{n.title}</h2>
                      {!n.readAt && (
                        <i
                          aria-label="Unread"
                          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                    {n.rule && (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer font-bold text-primary">
                          Why am I seeing this?
                        </summary>
                        <p className="mt-1 text-muted-foreground">{n.rule}</p>
                        {Object.keys(n.details).length > 0 && (
                          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-2 text-[10px] text-muted-foreground">
                            {JSON.stringify(n.details, null, 2)}
                          </pre>
                        )}
                      </details>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString("en-ZA", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Africa/Johannesburg",
                        })}
                      </span>
                      {actionTo && (
                        <Link
                          to={actionTo}
                          onClick={() => {
                            if (!n.readAt) void mark(n.id);
                          }}
                          className="text-xs font-bold text-primary"
                        >
                          Open
                        </Link>
                      )}
                      {!n.readAt && (
                        <button
                          onClick={() => void mark(n.id)}
                          className="text-xs font-semibold text-muted-foreground"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Page>
  );
}
