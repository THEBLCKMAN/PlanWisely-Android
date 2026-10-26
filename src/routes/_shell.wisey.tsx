import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Calendar, Lightbulb, TrendingUp, Wallet } from "lucide-react";
import { WiseyBot } from "@/components/cards";
import { toast } from "sonner";
import { ChatInput } from "@/components/chat-input";
import { Page } from "@/components/nav";
import { useApp } from "@/store/app-store";
import { SUGGESTED_PROMPTS, APP_TODAY } from "@/data/mock";
import { pwHead } from "@/lib/head";

export const Route = createFileRoute("/_shell/wisey")({
  head: () => pwHead("Wisey — PlanWisely", "Meet Wisey, your financial coach."),
  component: WiseyHome,
});

const PROMPT_ICONS = {
  wallet: Wallet,
  calendar: Calendar,
  trending: TrendingUp,
  lightbulb: Lightbulb,
} as const;

function WiseyHome() {
  const navigate = useNavigate();
  const { startConversation, askWisey, topCategoryForMonth, user } = useApp();
  const top = topCategoryForMonth(APP_TODAY.slice(0, 7));

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = startConversation();
    void askWisey(id, trimmed).catch((error) =>
      toast.error(error instanceof Error ? error.message : "Wisey could not reply."),
    );
    navigate({ to: "/wisey/chat" });
  };

  return (
    <Page className="min-h-dvh">
      {/* Hero with Wisey on a soft radial glow */}
      <div className="relative flex flex-col items-center pt-6 text-center">
        <div className="absolute top-2 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <motion.img
          src={WiseyBotUrl}
          alt="Wisey financial coach"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="relative h-36 w-36 object-contain drop-shadow-xl"
        />
        <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-foreground">
          Hi, {user.name.split(" ")[0] || "there"}! 👋
        </h1>
        <p className="mt-1 max-w-[280px] text-sm text-muted-foreground">
          I'm <span className="font-bold text-primary">Wisey</span>, your personal financial coach.
          How can I help you today?
        </p>
      </div>

      {/* Suggested prompts */}
      <div className="mt-6 space-y-3">
        <p className="text-[13px] font-bold text-foreground">Try asking me something like:</p>
        {SUGGESTED_PROMPTS.map((p, i) => {
          const Icon = PROMPT_ICONS[p.icon as keyof typeof PROMPT_ICONS];
          return (
            <motion.button
              key={p.text}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              onClick={() => send(p.text)}
              className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-soft transition active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={18} />
              </span>
              <span className="text-sm font-semibold text-foreground">{p.text}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Input bar */}
      <ChatInput
        onSend={send}
        topHint={
          top
            ? `You've spent R${top.amount.toLocaleString("en-ZA")} on ${top.name.toLowerCase()} this month`
            : undefined
        }
      />
    </Page>
  );
}

import wiseyAssetSrc from "@/assets/wisey-bot.png";
const wiseyAsset = { url: wiseyAssetSrc };
const WiseyBotUrl = wiseyAsset.url;
