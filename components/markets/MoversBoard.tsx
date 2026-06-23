"use client";

import Link from "next/link";
import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useBatchQuotes } from "@/lib/hooks";
import { MOVERS_UNIVERSE } from "@/lib/markets/leaders";
import { formatPrice, formatPercent, direction } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { DURATION, EASE, staggerContainer } from "@/lib/motion";
import type { MiniQuote } from "@/lib/types";

const SIDE_COUNT = 8;

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: DURATION.base, ease: EASE } },
};

function MoverRow({ q, rank, reduce, maxAbs }: { q: MiniQuote; rank: number; reduce: boolean; maxAbs: number }) {
  const dir = direction(q.changePct);
  const color = dir === "up" ? "var(--up)" : dir === "down" ? "var(--down)" : "var(--fg-muted)";
  // Rebase the magnitude bar to the largest move on screen so a crypto +60% and
  // an equity +2% aren't both pinned to the same width.
  const width = (Math.abs(q.changePct) / maxAbs) * 100;

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
        <span className="w-5 shrink-0 text-end font-mono-num text-xs" style={{ color: "var(--fg-dim)" }}>
          {rank}
        </span>
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

function Column({
  title,
  icon: Icon,
  tone,
  quotes,
  reduce,
}: {
  title: string;
  icon: typeof TrendingUp;
  tone: string;
  quotes: MiniQuote[];
  reduce: boolean;
}) {
  const maxAbs = Math.max(0.5, ...quotes.map((q) => Math.abs(q.changePct)));
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} style={{ color: tone }} />
        <h2 className="font-display text-lg font-bold">{title}</h2>
      </div>
      {quotes.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm" style={{ color: "var(--fg-dim)" }}>
          אין נתונים זמינים כרגע.
        </p>
      ) : (
        <motion.div
          className="flex flex-col gap-1"
          variants={staggerContainer(0.035)}
          initial="hidden"
          animate="show"
        >
          {quotes.map((q, i) => (
            <MoverRow key={q.symbol} q={q} rank={i + 1} reduce={reduce} maxAbs={maxAbs} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

/**
 * Movers of the day — the single cross-asset leaderboard (CLAUDE.md Phase 10).
 * Ranks the whole curated universe by today's anchored % move and surfaces the
 * biggest gainers and losers side by side. Shares the "movers" batch cache with
 * the 52-week range scans, so switching tabs is instant.
 */
export function MoversBoard() {
  const reduce = useReducedMotion() ?? false;
  const { data, isLoading } = useBatchQuotes("movers", MOVERS_UNIVERSE);

  const { gainers, losers } = useMemo(() => {
    const sorted = [...(data?.quotes ?? [])].sort((a, b) => b.changePct - a.changePct);
    return {
      gainers: sorted.filter((q) => q.changePct > 0).slice(0, SIDE_COUNT),
      losers: sorted
        .filter((q) => q.changePct < 0)
        .slice(-SIDE_COUNT)
        .reverse(),
    };
  }, [data]);

  if (isLoading && !data) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="panel p-4">
            <Skeleton className="mb-3 h-6 w-32 rounded" />
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
      <Column title="המובילים בעליות" icon={TrendingUp} tone="var(--up)" quotes={gainers} reduce={reduce} />
      <Column title="המובילים בירידות" icon={TrendingDown} tone="var(--down)" quotes={losers} reduce={reduce} />
    </div>
  );
}
