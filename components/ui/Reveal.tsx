"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Staggered entrance. Wrap a column of widgets in <RevealGroup> and each
 * <Reveal> child rises + fades in sequence. Respects reduced-motion via the
 * `initial`/`whileInView` transition only animating transform/opacity.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
