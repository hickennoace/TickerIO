"use client";

import { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SPRING } from "@/lib/motion";

export function WidgetCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      whileHover={reduce ? undefined : { y: -3 }}
      transition={SPRING.soft}
      className={`panel panel-hover p-5 ${className}`}
    >
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
            {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}
