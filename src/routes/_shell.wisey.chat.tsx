import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import { WiseyBot } from "@/components/cards";
import { useApp } from "@/store/app-store";
import { pwHead } from "@/lib/head";
import { ChatInput } from "@/components/chat-input";

export const Route = createFileRoute("/_shell/wisey/chat")({
  head: () => pwHead("Chat with Wisey — PlanWisely", "Personal financial guidance from Wisey."),
  component: WiseyChat,
});

function WiseyChat() {
  const navigate = useNavigate();
  const { conversations, activeConversationId, setActiveConversation, askWisey } = useApp();
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);

  const conversation = conversations.find((c) => c.id === activeConversationId) ?? conversations[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length, typing]);

  // Keep an active conversation selected
  useEffect(() => {
    if (!activeConversationId && conversation) setActiveConversation(conversation.id);
  }, [activeConversationId, conversation, setActiveConversation]);

  if (!conversation) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pendingRef.current) return;
    pendingRef.current = true;
    setTyping(true);
    try {
      await askWisey(conversation.id, trimmed);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Wisey could not prepare a reply. Please try again.",
      );
    } finally {
      setTyping(false);
      pendingRef.current = false;
    }
  };

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-30 glass flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate({ to: "/wisey" })}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-soft"
          aria-label="Back to Wisey home"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          <WiseyBot className="h-9 w-9" />
          <div className="text-left">
            <div className="text-sm font-extrabold text-foreground">Wisey</div>
            <div className="text-[10px] font-semibold text-muted-foreground">
              Connected assistant
            </div>
          </div>
        </div>
        <Link
          to="/wisey/history"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-soft"
          aria-label="Chat history"
        >
          <Menu size={18} />
        </Link>
      </div>

      {/* Messages */}
      <div className="space-y-4 px-5 pb-44 pt-4">
        {conversation.messages.length === 0 && (
          <div className="rounded-2xl bg-card p-5 text-center shadow-soft">
            <WiseyBot className="mx-auto h-16 w-16" />
            <p className="mt-2 text-sm font-semibold text-foreground">
              Ask me anything about your money
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Budgets, saving, NSFAS, investing — I'm here to help.
            </p>
          </div>
        )}

        {conversation.messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[82%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-soft ${
                m.role === "user"
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md bg-card text-foreground"
              }`}
            >
              {m.text}
            </div>
          </motion.div>
        ))}

        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-card px-4 py-3.5 shadow-soft">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-2 w-2 rounded-full bg-muted-foreground/60"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.18 }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={send} disabled={typing} />
    </div>
  );
}
