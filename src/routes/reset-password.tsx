import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/cards";
import { Field, PrimaryButton } from "@/components/ui";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { pwHead } from "@/lib/head";
export const Route = createFileRoute("/reset-password")({
  head: () =>
    pwHead("Choose a new password — PlanWisely", "Set a new password for your PlanWisely account."),
  component: ResetPassword,
});
function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters for your password.");
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error("Supabase is not configured.");
      return;
    }
    setBusy(true);
    const { error } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Your password has been updated.");
    await getSupabase().auth.signOut();
    void navigate({ to: "/login", replace: true });
  };
  return (
    <main className="flex min-h-dvh flex-col bg-background px-6 pb-10 pt-14">
      <Logo className="mx-auto h-16" />
      <h1 className="mt-10 text-[26px] font-extrabold text-foreground">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">Use at least 8 characters.</p>
      <form className="mt-8 space-y-5" onSubmit={submit}>
        <Field
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="New password"
        />
        <PrimaryButton disabled={busy} type="submit">
          {busy ? "Updating…" : "Update password"}
        </PrimaryButton>
      </form>
      <Link className="mt-auto pt-10 text-center text-sm font-bold text-primary" to="/login">
        Back to sign in
      </Link>
    </main>
  );
}
