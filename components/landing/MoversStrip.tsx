"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useBatchQuotes } from "@/lib/hooks";
import { MOVERS_UNIVERSE } from "@/lib/markets/leaders";
import { direction, formatPercent } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { fadeUp, staggerContainer } from "@/lib/motion";
import type { MiniQuote } from "@/lib/types";

const SIDE_COUNT = 4;

/** One compact mover chip — symbol + today's anchored % move, deep-linking to its dashboard. */
function MoverChip({ q }: { q: MiniQuote }) {
  const dir = direction(q.changePct);
  const color = dir === "up" ? "var(--up)" : dir === "down" ? "var(--down)" : "var(--fg-muted)";
  return (
    <motion.div variants={fadeUp}>
      <Link
        href={`/${encodeURIComponent(q.symbol)}`}
        className="panel panel-hover flex items-center justify-between gap-3 px-3.5 py-2.5"
        title={`${q.name} — today's anchored move`}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{q.display}</span>
          <span className="block truncate text-[11px]" style={{ color: "var(--fg-dim)" }}>
            {q.name}
          </span>
        </span>
        <span className="shrink-0 font-mono-num text-sm font-semibold" style={{ color }}>
          {formatPercent(q.changePct)}
        </span>
      </Link>
    </motion.div>
  );
}

/**
 * Landing "what's moving now" strip (CLAUDE.md Phase 10) — the day's biggest
 * gainers and losers from the curated cross-asset universe, one click from the
 * full Movers board. Shares the "movers" batch cache with /markets, so jumping
 * to the Leaders board afterwards is instant.
 */
export function MoversStrip() {
  const reduce = useReducedMotion();
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

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
            Moving today
          </h2>
          <span className="text-[11px]" style={{ color: "var(--fg-dim)" }}>
            anchored to today&apos;s open
          </span>
        </div>
        <Link
          href="/markets"
          className="group flex items-center gap-1 text-xs font-medium transition-colors hover:text-[var(--fg)]"
          style={{ color: "var(--fg-muted)" }}
        >
          All movers
          <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {isLoading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {Array.from({ length: SIDE_COUNT * 2 }).map((_, i) => (
            <Skeleton key={i} className="h-[54px] w-full rounded-xl" />
          ))}
        </div>
      ) : gainers.length + losers.length === 0 ? null : (
        <div className="grid gap-3 lg:grid-cols-2">
          {[
            { quotes: gainers, icon: TrendingUp, tone: "var(--up)" },
            { quotes: losers, icon: TrendingDown, tone: "var(--down)" },
          ].map(({ quotes, icon: Icon, tone }, col) => (
            <div key={col} className="flex items-stretch gap-3">
              <span
                className="hidden w-8 shrink-0 place-items-center rounded-xl sm:grid"
                style={{ background: `color-mix(in oklab, ${tone} 12%, transparent)`, color: tone }}
                aria-hidden
              >
                <Icon size={16} strokeWidth={2.2} />
              </span>
              <motion.div
                className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-4"
                variants={staggerContainer(0.05)}
                initial={reduce ? false : "hidden"}
                animate="show"
              >
                {quotes.map((q) => (
                  <MoverChip key={q.symbol} q={q} />
                ))}
              </motion.div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
