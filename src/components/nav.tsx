import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowLeftRight,
  Bell,
  Bot,
  CircleHelp,
  CircleUserRound,
  CalendarDays,
  Home,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Target,
  UserRound,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { getSupabase, getInitials } from "@/lib/supabase";
import { AnimatePresence } from "framer-motion";

/* ---------- Page transition wrapper ---------- */

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("px-5 pb-32", className)}
    >
      {children}
    </motion.main>
  );
}

/* ---------- Headers ---------- */

export function PageHeader({
  title,
  left = "back",
  right,
  backTo = "/dashboard",
  className,
}: {
  title: string;
  left?: "back" | "menu" | "none";
  right?: ReactNode;
  backTo?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between px-5 pb-3 pt-5",
        className,
      )}
    >
      <div className="w-10">
        {left === "back" && (
          <Link
            to={backTo}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-soft text-foreground"
          >
            <ArrowLeft size={18} />
          </Link>
        )}
        {left === "menu" && (
          <button
            onClick={() => window.dispatchEvent(new Event("planwisely:open-menu"))}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-soft text-foreground"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
        )}
      </div>
      <h1 className="text-lg font-extrabold tracking-tight text-foreground">{title}</h1>
      <div className="w-10 flex justify-end">{right}</div>
    </div>
  );
}

/* ---------- Floating bottom navigation ---------- */

const TABS = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/budget", label: "Budget", icon: Wallet },
  { to: "/transactions", label: "Transaction", icon: ArrowLeftRight },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/wisey", label: "Wisey", icon: Bot },
] as const;

const MENU_LINKS = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/budget", label: "My budget", icon: Wallet },
  { to: "/goals", label: "Goals & rewards", icon: Target },
  { to: "/upcoming", label: "Upcoming expenses", icon: CalendarDays },
  { to: "/payment-cycle", label: "Payment cycle", icon: CalendarDays },
  { to: "/challenges", label: "Savings challenges", icon: Trophy },
  { to: "/analytics", label: "Analytics", icon: Bot },
  { to: "/tips", label: "Money lessons", icon: CircleHelp },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "My profile", icon: UserRound },
] as const;

export function AppMenu() {
  const { menuOpen, setMenuOpen, user, isAdmin } = useApp();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const close = () => setMenuOpen(false);

  useEffect(() => {
    const open = () => setMenuOpen(true);
    window.addEventListener("planwisely:open-menu", open);
    return () => window.removeEventListener("planwisely:open-menu", open);
  }, [setMenuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, setMenuOpen]);

  const confirmLogout = async () => {
    setSigningOut(true);
    const { error } = await getSupabase().auth.signOut();
    setSigningOut(false);
    if (error) return;
    setLogoutOpen(false);
    close();
    await navigate({ to: "/login", replace: true });
  };

  return (
    <>
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[60] mx-auto max-w-[480px]">
            <motion.button
              aria-label="Close menu"
              className="absolute inset-0 h-full w-full bg-slate-950/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
              className="absolute inset-y-0 left-0 flex w-[min(86%,360px)] flex-col bg-background px-5 pb-6 pt-6 shadow-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
            >
              <div className="mb-7 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-navy text-sm font-extrabold text-navy-foreground">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      getInitials(user.name)
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-foreground">
                      {user.name || "Your profile"}
                    </p>
                    <p className="max-w-[205px] truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={close}
                  aria-label="Close menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground shadow-soft"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto">
                {MENU_LINKS.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={close}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-primary/10"
                  >
                    <Icon size={19} className="text-primary" />
                    {label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={close}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-primary/10"
                  >
                    <ShieldCheck size={19} className="text-primary" />
                    Admin dashboard
                  </Link>
                )}
                <Link
                  to="/help"
                  onClick={close}
                  className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-primary/10"
                >
                  <CircleHelp size={19} className="text-primary" />
                  Help & support
                </Link>
              </nav>
              <div className="mt-4 border-t border-border pt-4">
                <button
                  onClick={() => {
                    close();
                    setLogoutOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut size={19} />
                  Sign out
                </button>
                <p className="mt-3 text-center text-[10px] font-semibold tracking-wide text-muted-foreground">
                  PLANWISELY · MONEY WITH A PLAN
                </p>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {logoutOpen && (
          <motion.div
            className="fixed inset-0 z-[80] mx-auto flex max-w-[480px] flex-col bg-[#f4f7fb] px-7 pb-10 pt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              aria-label="Close logout confirmation"
              onClick={() => setLogoutOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow-soft"
            >
              <X size={20} />
            </button>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-8 flex h-36 w-36 items-center justify-center rounded-[2.5rem] bg-[#e2eaf5] text-navy">
                <CircleUserRound size={80} strokeWidth={1.4} />
              </div>
              <h2 className="max-w-xs text-2xl font-extrabold leading-tight text-[#14243d]">
                Are you sure you want to log out?
              </h2>
              <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
                You’ll need to log in again to access your account.
              </p>
            </div>
            <div className="space-y-3">
              <button
                disabled={signingOut}
                onClick={() => void confirmLogout()}
                className="w-full rounded-2xl bg-[#14243d] px-5 py-4 text-sm font-bold text-white disabled:opacity-60"
              >
                {signingOut ? "Logging out…" : "Log Out"}
              </button>
              <button
                onClick={() => setLogoutOpen(false)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-bold text-[#14243d]"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => pathname.startsWith(to);

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-4">
      <div className="pointer-events-auto mx-4 w-full max-w-[430px]">
        <div className="glass flex items-center justify-between rounded-[2rem] px-3 py-2 shadow-float ring-1 ring-border/60">
          {TABS.map((tab) => {
            const active = isActive(tab.to);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className="relative flex flex-1 flex-col items-center gap-0.5 rounded-3xl px-1 py-2"
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-1 inset-y-0 rounded-3xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon
                  size={20}
                  className={cn(
                    "relative z-10 transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "relative z-10 text-[10px] font-semibold transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
