"use client";

import { motion } from "motion/react";

/** A live "market is streaming" dot with an expanding halo. */
export function LivePulse({ color = "var(--up)", label }: { color?: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-flex h-2 w-2">
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full"
          style={{ background: color }}
          animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
      </span>
      {label && (
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
          {label}
        </span>
      )}
    </span>
  );
}
