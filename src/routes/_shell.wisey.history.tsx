import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { MessageSquare, Plus, Search } from "lucide-react";
import { useApp } from "@/store/app-store";
import { pwHead } from "@/lib/head";

export const Route = createFileRoute("/_shell/wisey/history")({
  head: () => pwHead("Wisey chat history — PlanWisely", "Your past Wisey conversations."),
  component: WiseyHistory,
});

function WiseyHistory() {
  const navigate = useNavigate();
  const { conversations, setActiveConversation, startConversation } = useApp();
  const [query, setQuery] = useState("");

  const filtered = conversations.filter((c) =>
    (c.title + c.messages.map((m) => m.text).join(" ")).toLowerCase().includes(query.toLowerCase()),
  );

  const open = (id: string) => {
    setActiveConversation(id);
    navigate({ to: "/wisey/chat" });
  };

  const startNew = () => {
    startConversation();
    navigate({ to: "/wisey/chat" });
  };

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-30 glass px-5 pb-3 pt-5">
        <div className="flex items-center justify-between">
          <Link
            to="/wisey"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-soft"
            aria-label="Back"
          >
            ←
          </Link>
          <h1 className="text-lg font-extrabold tracking-tight text-foreground">Chat History</h1>
          <button
            onClick={startNew}
            aria-label="Start a new conversation"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-full bg-card px-4 py-3 shadow-soft">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="space-y-2.5 px-5 pb-32 pt-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
            <p className="text-sm text-muted-foreground">No conversations match "{query}".</p>
          </div>
        ) : (
          filtered.map((c, i) => {
            const last = c.messages[c.messages.length - 1];
            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => open(c.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-soft transition active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-lg">
                  <MessageSquare size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-foreground">
                    {c.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {last
                      ? last.text.slice(0, 60) + (last.text.length > 60 ? "…" : "")
                      : "No messages yet"}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                  {new Date(c.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                </span>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
