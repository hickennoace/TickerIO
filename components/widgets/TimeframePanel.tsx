"use client";

import type { TimeframeRow } from "@/lib/types";
import { direction, formatPercent, formatSignedPrice } from "@/lib/format";
import { WidgetCard } from "./WidgetCard";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Anchored timeframe performance (CLAUDE.md §4). Each row is a change vs. the
 * *period open* anchor — never a rolling lookback. Anchor labels are shown so
 * the reference base is always explicit.
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
  return (
    <WidgetCard title="Performance">
      {loading || !rows ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {rows.map((tf) => {
            const dir = direction(tf.changePct);
            const color =
              dir === "up" ? "var(--up)" : dir === "down" ? "var(--down)" : "var(--fg-muted)";
            return (
              <div
                key={tf.label}
                className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3"
                title={`Anchor: ${new Date(tf.anchorAt).toUTCString()}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{tf.label}</span>
                  <span className="font-mono-num text-base font-semibold" style={{ color }}>
                    {formatPercent(tf.changePct)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs" style={{ color: "var(--fg-dim)" }}>
                  <span>since {tf.anchor}</span>
                  <span className="font-mono-num" style={{ color }}>
                    {formatSignedPrice(tf.changeAbs, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--fg-dim)" }}>
        Anchored to each period&apos;s open — not a rolling lookback. Hover for the exact UTC anchor.
      </p>
    </WidgetCard>
  );
}
