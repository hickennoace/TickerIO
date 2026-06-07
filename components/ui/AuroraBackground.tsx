"use client";

import { motion } from "motion/react";

/**
 * Animated aurora mesh. Two slow-drifting radial blobs tinted by market bias
 * (green = bullish, red = bearish, blue = neutral). Purely decorative, sits
 * behind content, ignores pointer events.
 */
export function AuroraBackground({ bias = 0 }: { bias?: number }) {
  const tint =
    bias >= 20 ? "22,199,132" : bias <= -20 ? "234,57,67" : "79,140,255";
  const tint2 = "124,92,255";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute h-[60vmax] w-[60vmax] rounded-full"
        style={{
          background: `radial-gradient(circle at center, rgba(${tint},0.16), transparent 60%)`,
          top: "-20%",
          left: "-10%",
          filter: "blur(40px)",
        }}
        animate={{ x: [0, 80, -40, 0], y: [0, 60, 30, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-[55vmax] w-[55vmax] rounded-full"
        style={{
          background: `radial-gradient(circle at center, rgba(${tint2},0.14), transparent 60%)`,
          top: "0%",
          right: "-15%",
          filter: "blur(40px)",
        }}
        animate={{ x: [0, -60, 30, 0], y: [0, 40, -30, 0], scale: [1, 0.95, 1.08, 1] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
