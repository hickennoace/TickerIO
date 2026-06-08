/**
 * Shared motion vocabulary (Phase 10 "Motion System v2").
 *
 * One source of truth for easings, durations, springs, and reusable variants so
 * every animation across the app feels like the same hand. Per CLAUDE.md §1.1
 * everything here animates transform/opacity only (GPU-composited, 60fps) and
 * callers gate looping/entrance motion behind `useReducedMotion`.
 */

import type { Transition, Variants } from "motion/react";

/** The house ease — a confident, premium ease-out used everywhere. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
  fast: 0.18,
  base: 0.35,
  slow: 0.6,
} as const;

/** Springs for layout / interactive motion. */
export const SPRING: Record<"soft" | "snappy", Transition> = {
  soft: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 },
  snappy: { type: "spring", stiffness: 420, damping: 32, mass: 0.7 },
};

/** Fade + small rise. The workhorse entrance. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE } },
};

/** Fade + slight scale — for popovers, dropdowns, badges. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: DURATION.fast, ease: EASE } },
};

/** Parent that staggers its children in. Tune `stagger` per list density. */
export function staggerContainer(stagger = 0.05, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}
