"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useBatchQuotes } from "@/lib/hooks";
import { formatPrice, formatPercent, direction } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { DURATION, EASE, staggerContainer } from "@/lib/motion";
import type { MiniQuote } from "@/lib/types";

/** Sort a quote list strongest-first by day % change. */
export function rankByChange(quotes: MiniQuote[]): MiniQuote[] {
  return [...quotes].sort((a, b) => b.changePct - a.changePct);
}

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: DURATION.base, ease: EASE } },
};

function Row({ q, rank, reduce }: { q: MiniQuote; rank?: number; reduce: boolean }) {
  const dir = direction(q.changePct);
  const color = dir === "up" ? "var(--up)" : dir === "down" ? "var(--down)" : "var(--fg-muted)";
  // Bar width scales with move magnitude, capped at 10% for a stable visual.
  const width = Math.min(Math.abs(q.changePct) / 10, 1) * 100;

  return (
    <motion.div variants={rowVariants}>
      <Link
        href={`/${encodeURIComponent(q.symbol)}`}
        className="panel-hover relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5"
      >
        <motion.span
          className="pointer-events-none absolute inset-y-0 start-0"
          style={{ background: color, opacity: 0.07 }}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: DURATION.slow, ease: EASE, delay: 0.1 }}
        />
        {rank != null && (
          <span className="w-5 shrink-0 text-end font-mono-num text-xs" style={{ color: "var(--fg-dim)" }}>
            {rank}
          </span>
        )}
        <span className="w-16 shrink-0 truncate font-semibold">{q.display}</span>
        <span className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--fg-muted)" }}>
          {q.name}
        </span>
        <span className="shrink-0 font-mono-num text-sm">{formatPrice(q.price, q.currency)}</span>
        <span className="w-20 shrink-0 text-end font-mono-num text-sm font-semibold" style={{ color }}>
          {formatPercent(q.changePct)}
        </span>
      </Link>
    </motion.div>
  );
}

/**
 * Fetches a group of symbols, ranks them strongest-first, and renders them as a
 * leaderboard. Used by the Crypto and Commodities tabs and the sector drilldown.
 */
export function RankedQuotes({
  cacheKey,
  symbols,
  max,
  showRank = true,
  enabled = true,
}: {
  cacheKey: string;
  symbols: string[];
  max?: number;
  showRank?: boolean;
  enabled?: boolean;
}) {
  const reduce = useReducedMotion() ?? false;
  const { data, isLoading } = useBatchQuotes(cacheKey, symbols, enabled);
  const ranked = useMemo(() => {
    const all = rankByChange(data?.quotes ?? []);
    return max ? all.slice(0, max) : all;
  }, [data, max]);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: Math.min(max ?? 8, 8) }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (ranked.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm" style={{ color: "var(--fg-dim)" }}>
        אין נתונים זמינים כרגע.
      </p>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-1"
      variants={staggerContainer(0.035)}
      initial="hidden"
      animate="show"
    >
      {ranked.map((q, i) => (
        <Row key={q.symbol} q={q} rank={showRank ? i + 1 : undefined} reduce={reduce} />
      ))}
    </motion.div>
  );
}
