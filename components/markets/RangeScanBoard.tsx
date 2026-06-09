"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpToLine, ArrowDownToLine } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useBatchQuotes } from "@/lib/hooks";
import { MOVERS_UNIVERSE } from "@/lib/markets/leaders";
import { formatPrice } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { DURATION, EASE, staggerContainer } from "@/lib/motion";
import type { MiniQuote } from "@/lib/types";

const SIDE_COUNT = 8;

/** A quote enriched with its position inside the trailing 52-week range. */
interface Ranged {
  q: MiniQuote;
  /** 0 = at the 52w low, 100 = at the 52w high. */
  position: number;
  /** % the price sits below its 52w high (0 = at the high). */
  pctBelowHigh: number;
  /** % the price sits above its 52w low (0 = at the low). */
  pctAboveLow: number;
}

/** Keep only quotes with a usable, well-formed 52-week range, and locate price within it. */
function withRange(quotes: MiniQuote[]): Ranged[] {
  const out: Ranged[] = [];
  for (const q of quotes) {
    const hi = q.fiftyTwoWeekHigh;
    const lo = q.fiftyTwoWeekLow;
    if (hi == null || lo == null || !(hi > lo) || q.price <= 0) continue;
    const position = Math.max(0, Math.min(100, ((q.price - lo) / (hi - lo)) * 100));
    out.push({
      q,
      position,
      pctBelowHigh: ((hi - q.price) / hi) * 100,
      pctAboveLow: ((q.price - lo) / lo) * 100,
    });
  }
  return out;
}

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: DURATION.base, ease: EASE } },
};

function RangeRow({ r, tone, metric, reduce }: { r: Ranged; tone: string; metric: string; reduce: boolean }) {
  return (
    <motion.div variants={rowVariants}>
      <Link
        href={`/${encodeURIComponent(r.q.symbol)}`}
        className="panel-hover flex items-center gap-3 rounded-lg px-3 py-2.5"
      >
        <span className="w-16 shrink-0 truncate font-semibold">{r.q.display}</span>
        <span className="hidden min-w-0 flex-1 truncate text-sm sm:block" style={{ color: "var(--fg-muted)" }}>
          {r.q.name}
        </span>
        {/* 52-week range track with the current price marked. */}
        <div className="relative h-1.5 w-24 shrink-0 rounded-full sm:w-28" style={{ background: "var(--border)" }}>
          <motion.span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
            style={{ background: tone, ["--tw-ring-color" as string]: "var(--panel)" }}
            initial={reduce ? false : { left: "50%", opacity: 0 }}
            animate={{ left: `${r.position}%`, opacity: 1 }}
            transition={{ duration: DURATION.slow, ease: EASE }}
          />
        </div>
        <span className="w-20 shrink-0 text-right font-mono-num text-sm">
          {formatPrice(r.q.price, r.q.currency)}
        </span>
        <span className="w-24 shrink-0 text-right font-mono-num text-xs font-semibold" style={{ color: tone }}>
          {metric}
        </span>
      </Link>
    </motion.div>
  );
}

function Column({
  title,
  subtitle,
  icon: Icon,
  tone,
  rows,
  metricFor,
  reduce,
}: {
  title: string;
  subtitle: string;
  icon: typeof ArrowUpToLine;
  tone: string;
  rows: Ranged[];
  metricFor: (r: Ranged) => string;
  reduce: boolean;
}) {
  return (
    <div className="panel p-4">
      <div className="mb-1 flex items-center gap-2">
        <Icon size={16} style={{ color: tone }} />
        <h2 className="font-display text-lg font-bold">{title}</h2>
      </div>
      <p className="mb-3 text-xs" style={{ color: "var(--fg-dim)" }}>
        {subtitle}
      </p>
      {rows.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm" style={{ color: "var(--fg-dim)" }}>
          No data available right now.
        </p>
      ) : (
        <motion.div
          className="flex flex-col gap-1"
          variants={staggerContainer(0.035)}
          initial="hidden"
          animate="show"
        >
          {rows.map((r) => (
            <RangeRow key={r.q.symbol} r={r} tone={tone} metric={metricFor(r)} reduce={reduce} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

/**
 * 52-week range scans (CLAUDE.md Phase 10) — surfaces names pressing the extremes
 * of their trailing-year range. "Near highs" is a breakout watch; "near lows" a
 * potential-capitulation / value scan. Reuses the shared "movers" batch cache.
 */
export function RangeScanBoard() {
  const reduce = useReducedMotion() ?? false;
  const { data, isLoading } = useBatchQuotes("movers", MOVERS_UNIVERSE);

  const { nearHighs, nearLows } = useMemo(() => {
    const ranged = withRange(data?.quotes ?? []);
    const byPosDesc = [...ranged].sort((a, b) => b.position - a.position);
    const byPosAsc = [...ranged].sort((a, b) => a.position - b.position);
    return {
      nearHighs: byPosDesc.slice(0, SIDE_COUNT),
      nearLows: byPosAsc.slice(0, SIDE_COUNT),
    };
  }, [data]);

  if (isLoading && !data) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="panel p-4">
            <Skeleton className="mb-3 h-6 w-40 rounded" />
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: SIDE_COUNT }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Column
        title="Near 52-Week Highs"
        subtitle="Breakout watch — pressing the top of the range"
        icon={ArrowUpToLine}
        tone="var(--up)"
        rows={nearHighs}
        metricFor={(r) => `${r.pctBelowHigh < 0.05 ? "at high" : `−${r.pctBelowHigh.toFixed(1)}%`}`}
        reduce={reduce}
      />
      <Column
        title="Near 52-Week Lows"
        subtitle="Pressing the bottom of the range"
        icon={ArrowDownToLine}
        tone="var(--down)"
        rows={nearLows}
        metricFor={(r) => `${r.pctAboveLow < 0.05 ? "at low" : `+${r.pctAboveLow.toFixed(1)}%`}`}
        reduce={reduce}
      />
    </div>
  );
}
