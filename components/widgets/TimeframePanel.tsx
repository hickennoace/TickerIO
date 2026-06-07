import type { TimeframeChange } from "@/lib/demo";
import { direction, formatPercent, formatSignedPrice } from "@/lib/format";
import { WidgetCard } from "./WidgetCard";
import { DemoBadge } from "@/components/ui/DemoBadge";

/**
 * Anchored timeframe performance (CLAUDE.md §4). Each row is a change vs. the
 * *period open* anchor — never a rolling lookback. The anchor label is shown
 * so the user always knows the reference base.
 */
export function TimeframePanel({ timeframes }: { timeframes: TimeframeChange[] }) {
  return (
    <WidgetCard title="Performance" action={<DemoBadge />}>
      <div className="grid grid-cols-2 gap-3">
        {timeframes.map((tf) => {
          const dir = direction(tf.changePct);
          const color =
            dir === "up" ? "var(--up)" : dir === "down" ? "var(--down)" : "var(--fg-muted)";
          return (
            <div
              key={tf.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3"
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
                  {formatSignedPrice(tf.changeAbs)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--fg-dim)" }}>
        Anchored to each period&apos;s open (UTC) — not a rolling lookback.
      </p>
    </WidgetCard>
  );
}
