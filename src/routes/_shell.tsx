import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import type { User } from "@supabase/supabase-js";
import { AppMenu, BottomNav } from "@/components/nav";
import { AppProvider } from "@/store/app-store";
import { pwHead } from "@/lib/head";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { Logo } from "@/components/cards";

export const Route = createFileRoute("/_shell")({
  head: () => pwHead("PlanWisely", "Plan your future, plan wisely."),
  component: ShellLayout,
});
function ShellLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }
    const supabase = getSupabase();
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setReady(true);
      if (data.session)
        void supabase.rpc("record_meaningful_activity", { p_type: "meaningful_login" });
      if (!data.session) void navigate({ to: "/login", replace: true });
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
      if (_event === "SIGNED_IN" && session)
        window.setTimeout(
          () => void supabase.rpc("record_meaningful_activity", { p_type: "meaningful_login" }),
          0,
        );
      if (!session) void navigate({ to: "/login", replace: true });
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [navigate]);
  if (!isSupabaseConfigured) return <SetupRequired />;
  if (!ready || !user)
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your account…</p>
      </div>
    );
  return (
    <AppProvider authUser={user}>
      <div className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-background">
        <Outlet />
        <BottomNav />
        <AppMenu />
      </div>
      <Toaster position="top-center" richColors />
    </AppProvider>
  );
}
function SetupRequired() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-7 text-center">
      <Logo className="mb-8 h-16" />
      <h1 className="text-2xl font-extrabold text-foreground">Connect your Supabase project</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
        Add your project URL and publishable key to <code>.env.local</code>, then restart
        PlanWisely. Follow <code>SUPABASE_SETUP.md</code> to configure the database.
      </p>
      <Link to="/login" className="mt-6 font-bold text-primary">
        Go to sign in
      </Link>
    </main>
  );
}
