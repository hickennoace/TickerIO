"use client";

import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { TimeframeRow } from "@/lib/types";
import { direction, formatPercent, formatSignedPrice } from "@/lib/format";
import { WidgetCard } from "./WidgetCard";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Anchored timeframe performance (CLAUDE.md §4). Each row shows the change vs.
 * the *period open* anchor as a diverging magnitude bar (rebased to the largest
 * absolute move on screen) so you can read relative strength at a glance —
 * never a rolling lookback.
 */
export function TimeframePanel({
  rows,
  currency = "USD",
  loading,
}: {
  rows?: TimeframeRow[];
  currency?: string;
  loading: boolean;
}) {
  const maxAbs = rows && rows.length ? Math.max(...rows.map((r) => Math.abs(r.changePct)), 0.5) : 1;

  // Best / worst period summary.
  const best = rows?.reduce((a, b) => (b.changePct > a.changePct ? b : a));
  const worst = rows?.reduce((a, b) => (b.changePct < a.changePct ? b : a));

  return (
    <WidgetCard
      title="Performance"
      action={
        best && worst ? (
          <span className="flex items-center gap-2 text-[11px]" style={{ color: "var(--fg-dim)" }}>
            <span className="flex items-center gap-0.5" style={{ color: "var(--up)" }}>
              <ArrowUpRight size={11} /> {best.label}
            </span>
            <span className="flex items-center gap-0.5" style={{ color: "var(--down)" }}>
              <ArrowDownRight size={11} /> {worst.label}
            </span>
          </span>
        ) : null
      }
    >
      {loading || !rows ? (
        <div className="space-y-3.5 py-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((tf, i) => {
            const dir = direction(tf.changePct);
            const color =
              dir === "up" ? "var(--up)" : dir === "down" ? "var(--down)" : "var(--fg-muted)";
            const pct = Math.min(100, (Math.abs(tf.changePct) / maxAbs) * 100);
            const isUp = tf.changePct >= 0;
            return (
              <div
                key={tf.label}
                className="grid grid-cols-[64px_1fr_auto] items-center gap-3"
                title={`Anchor: ${new Date(tf.anchorAt).toUTCString()} · ${formatSignedPrice(tf.changeAbs, currency)}`}
              >
                {/* Label + anchor */}
                <div className="leading-tight">
                  <div className="text-sm font-semibold">{tf.label}</div>
                  <div className="text-[10px]" style={{ color: "var(--fg-dim)" }}>
                    {tf.anchor}
                  </div>
                </div>

                {/* Diverging magnitude bar */}
                <div className="relative h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div
                    className="absolute left-1/2 top-1/2 h-3.5 w-px -translate-y-1/2"
                    style={{ background: "var(--border-strong)" }}
                  />
                  <motion.div
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${isUp ? "transparent" : color}, ${color})`,
                      left: isUp ? "50%" : undefined,
                      right: isUp ? undefined : "50%",
                      boxShadow: `0 0 12px -2px ${color}`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct / 2}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>

                {/* Value */}
                <div className="w-[68px] text-right">
                  <div className="font-mono-num text-sm font-semibold" style={{ color }}>
                    {formatPercent(tf.changePct)}
                  </div>
                  <div className="font-mono-num text-[10px]" style={{ color: "var(--fg-dim)" }}>
                    {formatSignedPrice(tf.changeAbs, currency)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-4 border-t border-[var(--border)] pt-3 text-[11px] leading-relaxed" style={{ color: "var(--fg-dim)" }}>
        Each move is measured from that period&apos;s <span style={{ color: "var(--fg-muted)" }}>open</span> (UTC) — not a rolling lookback. Bars scale to the largest move shown.
      </p>
    </WidgetCard>
  );
}
