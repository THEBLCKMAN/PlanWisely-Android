import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/cards";
import { Field, PrimaryButton } from "@/components/ui";
import { pwHead } from "@/lib/head";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/register")({
  head: () =>
    pwHead("Create account — PlanWisely", "Join PlanWisely and start your money journey."),
  component: RegisterScreen,
});

function RegisterScreen() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [wiseyAiConsent, setWiseyAiConsent] = useState(false);
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState("");

  const [busy, setBusy] = useState(false);
  const register = async () => {
    if (
      !name.trim() ||
      !/^\S+@\S+\.\S+$/.test(email.trim()) ||
      password.length < 8 ||
      !birthDate ||
      !privacyConsent
    ) {
      toast.error(
        "Enter your details, date of birth, accept the privacy notice and use a password with at least 8 characters.",
      );
      return;
    }
    const age = Math.floor(
      (Date.now() - new Date(`${birthDate}T00:00:00`).getTime()) / (365.2425 * 24 * 60 * 60 * 1000),
    );
    if (age < 13 || age > 120) {
      toast.error("Enter a valid date of birth.");
      return;
    }
    if (age < 18 && (!guardianConsent || !/^\S+@\S+\.\S+$/.test(guardianEmail.trim()))) {
      toast.error(
        "A guardian must confirm consent and provide a valid email address for users under 18.",
      );
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error("Add your Supabase settings before creating an account.");
      return;
    }
    setBusy(true);
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          birth_date: birthDate,
          privacy_consent: privacyConsent,
          wisey_ai_consent: wiseyAiConsent,
          guardian_consent: age < 18 && guardianConsent,
          guardian_email: age < 18 ? guardianEmail.trim() : null,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) navigate({ to: "/dashboard", replace: true });
    else toast.success("Account created. Check your email to confirm it, then sign in.");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 pb-10 pt-14">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-1 flex-col"
      >
        <Link
          to="/login"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-soft"
        >
          ←
        </Link>
        <Logo className="mx-auto mt-2 h-14" />

        <h1 className="mt-8 text-[26px] font-extrabold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Your smart money journey starts here.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Create your account to save your money plan securely.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            register();
          }}
          className="mt-8"
        >
          <div className="space-y-4">
            <Field label="Full name" value={name} onChange={setName} placeholder="Your full name" />
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
            />
            <Field label="Date of birth" value={birthDate} onChange={setBirthDate} type="date" />
            <label className="flex items-start gap-3 rounded-xl bg-card p-3 text-xs leading-relaxed text-muted-foreground shadow-soft">
              <input
                className="mt-0.5"
                type="checkbox"
                checked={privacyConsent}
                onChange={(e) => setPrivacyConsent(e.target.checked)}
              />
              <span>
                I agree that PlanWisely may process my financial information to provide budgeting,
                alerts and savings features. I have read the{" "}
                <Link to="/privacy" className="font-bold text-primary underline">
                  privacy notice
                </Link>
                .
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl bg-card p-3 text-xs leading-relaxed text-muted-foreground shadow-soft">
              <input
                className="mt-0.5"
                type="checkbox"
                checked={wiseyAiConsent}
                onChange={(e) => setWiseyAiConsent(e.target.checked)}
              />
              <span>
                Optional: I agree that Wisey may send my questions and limited financial summary to
                the AI provider configured for this app. I can change this in Settings.
              </span>
            </label>
            {birthDate &&
              Math.floor(
                (Date.now() - new Date(`${birthDate}T00:00:00`).getTime()) /
                  (365.2425 * 24 * 60 * 60 * 1000),
              ) < 18 && (
                <div className="space-y-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
                  <p className="text-xs font-bold text-foreground">
                    Guardian consent required for users under 18
                  </p>
                  <Field
                    label="Guardian email"
                    value={guardianEmail}
                    onChange={setGuardianEmail}
                    type="email"
                    placeholder="guardian@example.com"
                  />
                  <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                    <input
                      className="mt-0.5"
                      type="checkbox"
                      checked={guardianConsent}
                      onChange={(e) => setGuardianConsent(e.target.checked)}
                    />
                    <span>
                      I confirm that my parent or guardian has given consent for this account.
                    </span>
                  </label>
                </div>
              )}
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Create a password"
              type="password"
            />
          </div>
          <div className="mt-6">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create Account"}
            </PrimaryButton>
          </div>
        </form>

        <p className="mt-auto pt-10 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-primary">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
