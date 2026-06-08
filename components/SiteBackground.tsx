"use client";

import { motion, useReducedMotion } from "motion/react";
import { useBias } from "@/store/useBias";

/**
 * The living background — present on every page (mounted in the root layout).
 * Layers: obsidian base → two drifting gradient orbs (tinted by market bias) →
 * static perspective grid → film grain.
 *
 * PERF: orbs use soft radial-gradients (no `filter: blur`, which is ruinously
 * expensive to re-rasterize every frame) and animate only `transform`, which
 * the compositor handles on the GPU. The grid is static; no paint-heavy
 * `background-position` animation. Decorative + hidden from assistive tech.
 */
export function SiteBackground() {
  const bias = useBias((s) => s.bias);
  const reduce = useReducedMotion();

  const primary =
    bias >= 20 ? "31, 211, 150" : bias <= -20 ? "255, 77, 94" : "91, 155, 255";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(20,28,48,0.5), transparent 60%), var(--bg)",
        }}
      />

      {/* Drifting orbs — soft radial gradients, GPU-composited transforms only */}
      <motion.div
        className="absolute h-[70vmax] w-[70vmax] rounded-full"
        style={{
          top: "-25%",
          left: "-15%",
          background: `radial-gradient(circle at center, rgba(${primary},0.20), rgba(${primary},0.05) 35%, transparent 68%)`,
          willChange: "transform",
        }}
        animate={reduce ? undefined : { x: [0, 70, -20, 0], y: [0, 55, 25, 0] }}
        transition={{ duration: 36, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-[64vmax] w-[64vmax] rounded-full"
        style={{
          top: "-5%",
          right: "-18%",
          background:
            "radial-gradient(circle at center, rgba(154,107,255,0.16), rgba(154,107,255,0.04) 35%, transparent 68%)",
          willChange: "transform",
        }}
        animate={reduce ? undefined : { x: [0, -55, 25, 0], y: [0, 45, -25, 0] }}
        transition={{ duration: 44, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Static perspective grid + grain */}
      <div className="bg-grid" />
      <div className="grain" />
    </div>
  );
}
