import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { MailWarning } from "lucide-react";
import { Field, PrimaryButton } from "@/components/ui";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { pwHead } from "@/lib/head";

export const Route = createFileRoute("/forgot-password")({
  head: () => pwHead("Reset password — PlanWisely", "Recover access to your PlanWisely account."),
  component: ForgotPasswordScreen,
});

function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [showNotice, setShowNotice] = useState(false);

  if (showNotice) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success"
        >
          <MailWarning size={36} />
        </motion.div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-foreground">
          Check your email
        </h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          If an account exists, a password reset link was sent to{" "}
          <span className="font-semibold text-foreground">{email}</span>. Connect Supabase Auth to
          enable password recovery.
        </p>
        <Link
          to="/login"
          className="mt-8 rounded-2xl bg-navy px-8 py-3.5 text-[15px] font-bold text-navy-foreground shadow-float"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 pb-10 pt-14">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col"
      >
        <Link
          to="/login"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-soft"
        >
          ←
        </Link>
        <h1 className="mt-8 text-[26px] font-extrabold tracking-tight text-foreground">
          Forgot password?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your account email and we’ll send a password reset link.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
              toast.error("Enter a valid email address.");
              return;
            }
            if (!isSupabaseConfigured) {
              toast.error("Add your Supabase settings to enable password recovery.");
              return;
            }
            void getSupabase()
              .auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/reset-password`,
              })
              .then(({ error }) => {
                if (error) toast.error(error.message);
                else setShowNotice(true);
              });
          }}
          className="mt-8"
        >
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            type="email"
          />
          <div className="mt-6">
            <PrimaryButton type="submit">Send reset link</PrimaryButton>
          </div>
        </form>
        <p className="mt-3 text-center text-[11px] text-muted-foreground"></p>
      </motion.div>
    </div>
  );
}
