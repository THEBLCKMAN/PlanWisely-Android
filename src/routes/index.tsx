import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Logo } from "@/components/cards";
import { pwHead } from "@/lib/head";

export const Route = createFileRoute("/")({
  head: () => pwHead("PlanWisely", "Plan your future, plan wisely."),
  component: SplashScreen,
});

function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: "/login", replace: true });
    }, 2400);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="gradient-brand relative flex min-h-dvh flex-col items-center justify-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <Logo className="h-40" light />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="mt-6 text-sm font-semibold tracking-[0.3em] uppercase text-white/85"
      >
        Plan your future, plan wisely
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="absolute bottom-20 flex gap-2"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-white/80"
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
          />
        ))}
      </motion.div>

      <span className="absolute -left-16 top-1/4 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <span className="absolute -right-12 bottom-1/4 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
    </div>
  );
}
