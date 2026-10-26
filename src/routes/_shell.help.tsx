import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Mail, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/nav";
import { PrimaryButton, TextArea } from "@/components/ui";
import { useApp } from "@/store/app-store";
import { pwHead } from "@/lib/head";
import { getSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/_shell/help")({
  head: () => pwHead("Help & support — PlanWisely", "Find answers and contact PlanWisely support."),
  component: HelpPage,
});

const FAQ = [
  [
    "How do I add a transaction?",
    "Open Transactions in the menu or bottom bar, then choose Add expense or Add income. Your entry updates your dashboard totals.",
  ],
  [
    "Can PlanWisely connect to my bank?",
    "Bank connections are planned for a later release. This version uses manual entries so you stay in control.",
  ],
  [
    "Where is my information saved?",
    "Your profile and money plan are saved to your secure PlanWisely account.",
  ],
  [
    "Is Wisey financial advice?",
    "Wisey provides general financial education and does not replace advice from a qualified financial professional.",
  ],
] as const;

function HelpPage() {
  const { sendSupportMessage, userId } = useApp();
  const [open, setOpen] = useState<number | null>(0);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState<
    Array<{
      id: string;
      message: string;
      status: string;
      admin_reply: string | null;
      created_at: string;
    }>
  >([]);
  const loadRequests = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from("support_requests")
      .select("id,message,status,admin_reply,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error) setRequests(data || []);
  }, [userId]);
  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);
  const sendMessage = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message first.");
      return;
    }
    setSending(true);
    try {
      await sendSupportMessage(message);
      setMessage("");
      await loadRequests();
      toast.success("Your message was sent to PlanWisely support.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  };
  return (
    <Page className="min-h-dvh">
      <PageHeader title="Help & support" left="menu" />
      <div className="mb-5 rounded-3xl gradient-brand p-5 text-white shadow-float">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/75">
          <MessageCircle size={15} /> We're here to help
        </div>
        <h2 className="mt-2 text-xl font-extrabold">Questions about your money plan?</h2>
        <p className="mt-1 text-sm text-white/80">Browse quick answers or send the team a note.</p>
      </div>
      <h2 className="mb-3 px-1 text-sm font-extrabold text-foreground">
        Frequently asked questions
      </h2>
      <div className="mb-6 space-y-2">
        {FAQ.map(([question, answer], index) => (
          <div key={question} className="rounded-2xl bg-card shadow-soft">
            <button
              onClick={() => setOpen(open === index ? null : index)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-bold text-foreground"
            >
              {question}
              <ChevronDown
                size={17}
                className={`shrink-0 transition-transform ${open === index ? "rotate-180" : ""}`}
              />
            </button>
            {open === index && (
              <p className="px-4 pb-4 text-xs leading-relaxed text-muted-foreground">{answer}</p>
            )}
          </div>
        ))}
      </div>
      <div className="rounded-3xl bg-card p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <Mail size={17} className="text-primary" />
          <h2 className="text-sm font-extrabold text-foreground">Contact support</h2>
        </div>
        <TextArea
          label="How can we help?"
          value={message}
          onChange={setMessage}
          placeholder="Tell us what you need help with…"
        />
        <div className="mt-3">
          <PrimaryButton
            className="flex items-center justify-center gap-2"
            onClick={sendMessage}
            disabled={sending}
          >
            <Send size={16} /> {sending ? "Sending…" : "Send to support"}
          </PrimaryButton>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Your message is sent securely to the support inbox for follow-up.
        </p>
      </div>
      {requests.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-extrabold">Your support messages</h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <article key={r.id} className="rounded-2xl bg-card p-4 shadow-soft">
                <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                  <span>{new Date(r.created_at).toLocaleDateString("en-ZA")}</span>
                  <span className="capitalize">{r.status.replace("_", " ")}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{r.message}</p>
                {r.admin_reply && (
                  <p className="mt-3 rounded-xl bg-primary/8 p-3 text-xs">
                    <strong>PlanWisely support replied:</strong>
                    <br />
                    {r.admin_reply}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}
