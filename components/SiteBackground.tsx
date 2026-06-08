"use client";

import { motion } from "motion/react";
import { useBias } from "@/store/useBias";

/**
 * The living background — present on every page (mounted in the root layout).
 * Layers, back to front: obsidian base → drifting gradient orbs (tinted by
 * market bias) → perspective grid → film grain. Decorative; ignores pointer
 * events and is hidden from assistive tech.
 */
export function SiteBackground() {
  const bias = useBias((s) => s.bias);

  // Bias → primary orb color. Bullish green, bearish red, neutral blue.
  const primary =
    bias >= 20 ? "31, 211, 150" : bias <= -20 ? "255, 77, 94" : "91, 155, 255";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(20,28,48,0.55), transparent 60%), var(--bg)",
        }}
      />

      {/* Drifting orbs */}
      <motion.div
        className="absolute h-[62vmax] w-[62vmax] rounded-full"
        style={{
          top: "-22%",
          left: "-12%",
          background: `radial-gradient(circle at center, rgba(${primary},0.18), transparent 62%)`,
          filter: "blur(48px)",
        }}
        animate={{ x: [0, 90, -30, 0], y: [0, 70, 30, 0], scale: [1, 1.12, 0.96, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-[55vmax] w-[55vmax] rounded-full"
        style={{
          top: "-5%",
          right: "-15%",
          background: "radial-gradient(circle at center, rgba(154,107,255,0.16), transparent 62%)",
          filter: "blur(48px)",
        }}
        animate={{ x: [0, -70, 30, 0], y: [0, 50, -30, 0], scale: [1, 0.94, 1.1, 1] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-[48vmax] w-[48vmax] rounded-full"
        style={{
          bottom: "-25%",
          left: "30%",
          background: "radial-gradient(circle at center, rgba(46,230,196,0.10), transparent 62%)",
          filter: "blur(56px)",
        }}
        animate={{ x: [0, 50, -40, 0], y: [0, -40, 20, 0], scale: [1, 1.08, 0.95, 1] }}
        transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Perspective grid + grain */}
      <div className="bg-grid" />
      <div className="grain" />
    </div>
  );
}
