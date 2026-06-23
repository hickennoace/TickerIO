"use client";

import { motion } from "motion/react";
import { UI, biasLabelHe } from "@/lib/i18n/he";
import { WidgetCard } from "./WidgetCard";
import { Skeleton } from "@/components/ui/Skeleton";

function biasColor(score: number): string {
  if (score < -20) return "var(--down)";
  if (score > 20) return "var(--up)";
  return "var(--warn)";
}

function Bar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.abs(value));
  const color = value < 0 ? "var(--down)" : "var(--up)";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span style={{ color: "var(--fg-muted)" }}>{label}</span>
        <span className="font-mono-num" style={{ color }}>
          {value > 0 ? "+" : ""}
          {value}
        </span>
      </div>
      <div className="relative h-2 rounded-full" style={{ background: "var(--panel-2)" }}>
        <div className="absolute left-1/2 top-0 h-full w-px" style={{ background: "var(--border-strong)" }} />
        <motion.div
          className="absolute top-0 h-full rounded-full"
          style={{ background: color, left: value < 0 ? `${50 - pct / 2}%` : "50%" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct / 2}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

/** Algorithmic trend bias: technical momentum + sentiment (CLAUDE.md §5.3). */
export function TrendBiasIndicator({
  bias,
  technical,
  sentiment,
  loading,
}: {
  bias?: number;
  technical?: number;
  sentiment?: number;
  label?: string;
  loading: boolean;
}) {
  return (
    <WidgetCard title={UI.trendBias}>
      {loading || bias == null ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: biasColor(bias) }}>
              {biasLabelHe(bias)}
            </span>
            <span className="font-mono-num text-sm" style={{ color: "var(--fg-dim)" }}>
              {bias > 0 ? "+" : ""}
              {bias}
            </span>
          </div>
          <div className="space-y-3">
            <Bar label={UI.technicalMomentum} value={technical ?? 0} />
            <Bar label={UI.marketSentiment} value={sentiment ?? 0} />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--fg-dim)" }}>
            {UI.biasWeighting}
          </p>
        </>
      )}
    </WidgetCard>
  );
}
