import { motion } from "framer-motion";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";

/**
 * Shared Wisey chat input bar.
 * Rendered fixed above the floating bottom navigation.
 */
export function ChatInput({
  onSend,
  className,
  disabled = false,
  topHint,
}: {
  onSend: (text: string) => void;
  className?: string;
  disabled?: boolean;
  topHint?: string;
}) {
  const { draft, setDraft, submit } = useChatDraft(onSend, disabled);
  return (
    <div className={cn("fixed inset-x-0 bottom-24 z-30 px-5", className)}>
      {topHint && (
        <p className="mx-auto mb-2 max-w-[400px] px-2 text-center text-[11px] font-semibold text-muted-foreground">
          {topHint}
        </p>
      )}
      <form
        onSubmit={submit}
        className="glass mx-auto flex w-full max-w-[400px] items-center gap-2 rounded-full p-2 shadow-float ring-1 ring-border/60"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          aria-label="Message Wisey"
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </form>
    </div>
  );
}

import { useState } from "react";

function useChatDraft(onSend: (text: string) => void, disabled: boolean) {
  const [draft, setDraft] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !draft.trim()) return;
    onSend(draft.trim());
    setDraft("");
  };
  return { draft, setDraft, submit };
}
