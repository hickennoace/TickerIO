"use client";

import { BarChart3, Brain, Clock, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motion";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BarChart3,
    title: "TradingView-grade charts",
    body: "Draw trendlines, switch intervals, and read the tape with the official Advanced Charting widget.",
  },
  {
    icon: Clock,
    title: "Anchored timeframes",
    body: "Weekly means the week's open — not a rolling 7-day lookback. The way prop desks actually read it.",
  },
  {
    icon: Brain,
    title: "AI sentiment & bias",
    body: "Background news and reports distilled into a bottom-line read, a Fear & Greed gauge, and a trend bias.",
  },
];

/** Feature cards that reveal as they scroll into view. */
export function FeatureGrid() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="grid w-full gap-4 pb-24 sm:grid-cols-3"
      variants={staggerContainer(0.1)}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {FEATURES.map((f) => (
        <motion.div key={f.title} variants={fadeUp} className="panel panel-hover group p-6 text-left">
          <span
            className="grid h-10 w-10 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={{ background: "var(--panel-2)" }}
          >
            <f.icon size={20} style={{ color: "var(--accent)" }} />
          </span>
          <h3 className="font-display mt-4 text-lg font-bold">{f.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)]">{f.body}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
