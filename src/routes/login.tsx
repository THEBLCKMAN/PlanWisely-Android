import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/cards";
import { Field, PrimaryButton } from "@/components/ui";
import { pwHead } from "@/lib/head";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => pwHead("Sign in — PlanWisely", "Welcome back to PlanWisely."),
  component: LoginScreen,
});

function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your email and password to continue.");
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error("Add your Supabase settings before signing in.");
      return;
    }
    setBusy(true);
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 pb-10 pt-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-1 flex-col"
      >
        <Logo className="mx-auto h-16" />

        <h1 className="mt-10 text-[26px] font-extrabold tracking-tight text-foreground">
          Welcome back 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to keep your money plan on track.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Sign in securely to your PlanWisely account.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            signIn();
          }}
          className="mt-8"
        >
          <div className="space-y-4">
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
            />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              type="password"
            />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-[13px] font-semibold text-primary">
                Forgot password?
              </Link>
            </div>
          </div>
          <div className="mt-6">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign In"}
            </PrimaryButton>
          </div>
        </form>

        <p className="mt-auto pt-10 text-center text-sm text-muted-foreground">
          New to PlanWisely?{" "}
          <Link to="/register" className="font-bold text-primary">
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
