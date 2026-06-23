"use client";

import { BarChart3, Brain, Clock, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motion";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BarChart3,
    title: "גרפים ברמת TradingView",
    body: "שרטטו קווי מגמה, החליפו טווחי זמן וקראו את השוק עם ווידג'ט הגרפים המתקדם הרשמי.",
  },
  {
    icon: Clock,
    title: "טווחי זמן מעוגנים",
    body: "שבועי הוא הפתיחה של השבוע — לא חלון נע של 7 ימים. כך שולחנות המסחר באמת קוראים את השוק.",
  },
  {
    icon: Brain,
    title: "סנטימנט ונטייה מבוססי בינה מלאכותית",
    body: "חדשות ודיווחים מהרקע מזוקקים לשורה תחתונה, מד פחד ותאוות בצע ונטיית מגמה.",
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
        <motion.div key={f.title} variants={fadeUp} className="panel panel-hover group p-6 text-start">
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
