import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------- Form fields ---------- */

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-card px-4 py-3 text-[15px] text-foreground shadow-soft outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-muted"
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3 text-[15px] text-foreground shadow-soft outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full appearance-none rounded-xl border border-input bg-card px-4 py-3 text-[15px] shadow-soft outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
          value ? "text-foreground" : "text-muted-foreground/70",
        )}
      >
        <option value="">{placeholder ?? "Select an option"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---------- Buttons ---------- */

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-2xl bg-navy py-3.5 text-[15px] font-bold text-navy-foreground shadow-float transition active:brightness-110 disabled:opacity-50",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border border-border bg-card py-3.5 text-[15px] font-semibold text-foreground shadow-soft transition hover:bg-accent",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

/* ---------- Chips & tabs ---------- */

export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition",
        active
          ? "bg-primary text-primary-foreground shadow-soft"
          : "bg-card text-muted-foreground shadow-soft hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function SegmentedTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
}) {
  return (
    <div className="flex rounded-full bg-muted p-1">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className="relative flex-1 rounded-full py-2 text-[13px] font-semibold transition"
        >
          {active === t && (
            <motion.span
              layoutId="segmented-pill"
              className="absolute inset-0 rounded-full bg-card shadow-soft"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <span
            className={cn(
              "relative z-10",
              active === t ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {t}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Progress ---------- */

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={cn(
          "h-full rounded-full",
          value >= 100 ? "bg-destructive" : value >= 80 ? "bg-warning" : "bg-success",
        )}
      />
    </div>
  );
}

/* ---------- Bottom sheet ---------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] rounded-t-[2rem] bg-card px-5 pb-8 pt-3 shadow-float"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-full bg-muted p-2 text-muted-foreground transition hover:text-foreground"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
