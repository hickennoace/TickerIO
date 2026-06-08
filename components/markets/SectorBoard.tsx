"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useBatchQuotes } from "@/lib/hooks";
import { formatPercent, direction } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Skeleton } from "@/components/ui/Skeleton";
import { SECTORS, type SectorDef } from "@/lib/markets/leaders";
import { DURATION, EASE, SPRING, staggerContainer } from "@/lib/motion";
import { RankedQuotes } from "./RankedQuotes";
import type { MiniQuote } from "@/lib/types";

const ETF_TO_SECTOR = new Map(SECTORS.map((s) => [s.etf, s]));

/** Heat tint for a sector tile — green/red intensity scales with the move. */
function tint(pct: number): string {
  const dir = direction(pct);
  const a = Math.min(Math.abs(pct) / 3, 1) * 0.16 + 0.04;
  if (dir === "up") return `rgba(22, 199, 132, ${a})`;
  if (dir === "down") return `rgba(234, 57, 67, ${a})`;
  return "var(--panel)";
}

const tileVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE } },
};

function SectorTile({
  sector,
  quote,
  selected,
  reduce,
  onClick,
}: {
  sector: SectorDef;
  quote?: MiniQuote;
  selected: boolean;
  reduce: boolean;
  onClick: () => void;
}) {
  const pct = quote?.changePct ?? 0;
  const dir = direction(pct);
  const color = dir === "up" ? "var(--up)" : dir === "down" ? "var(--down)" : "var(--fg-muted)";

  return (
    <motion.button
      layout={!reduce}
      variants={tileVariants}
      whileHover={reduce ? undefined : { y: -3 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={SPRING.soft}
      onClick={onClick}
      className="panel relative flex flex-col items-start gap-1 p-3 text-left"
      style={{
        background: quote ? tint(pct) : "var(--panel)",
        outline: selected ? "1.5px solid var(--accent)" : "none",
      }}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-semibold">{sector.label}</span>
        <ChevronRight size={14} style={{ color: selected ? "var(--accent)" : "var(--fg-dim)" }} />
      </div>
      <div className="flex items-baseline gap-2">
        {quote ? (
          <AnimatedNumber
            value={pct}
            format={formatPercent}
            className="font-mono-num text-lg font-bold"
            style={{ color }}
          />
        ) : (
          <Skeleton className="h-5 w-14" />
        )}
        <span className="text-xs" style={{ color: "var(--fg-dim)" }}>
          {sector.etf}
        </span>
      </div>
    </motion.button>
  );
}

export function SectorBoard() {
  const [selected, setSelected] = useState<string>("technology");
  const reduce = useReducedMotion() ?? false;

  const etfSymbols = useMemo(() => SECTORS.map((s) => s.etf), []);
  const { data } = useBatchQuotes("sectors-etf", etfSymbols);

  // ETF symbol may resolve with suffixes; match on the leading root.
  const quoteFor = (etf: string): MiniQuote | undefined =>
    data?.quotes.find((q) => q.symbol.toUpperCase() === etf || q.display.toUpperCase() === etf);

  // Order tiles strongest sector first once data is in.
  const ordered = useMemo(() => {
    if (!data) return SECTORS;
    return [...SECTORS].sort(
      (a, b) => (quoteFor(b.etf)?.changePct ?? -999) - (quoteFor(a.etf)?.changePct ?? -999),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const active = ETF_TO_SECTOR.get(SECTORS.find((s) => s.key === selected)?.etf ?? "XLK");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
          Sector performance
        </h2>
        <p className="mb-3 text-xs" style={{ color: "var(--fg-dim)" }}>
          Today&apos;s move by SPDR sector ETF · click a sector for its leading stocks
        </p>
        <motion.div
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4"
          variants={staggerContainer(0.04)}
          initial="hidden"
          animate="show"
        >
          {ordered.map((s) => (
            <SectorTile
              key={s.key}
              sector={s}
              quote={quoteFor(s.etf)}
              selected={s.key === selected}
              reduce={reduce}
              onClick={() => setSelected(s.key)}
            />
          ))}
        </motion.div>
      </div>

      {active && (
        <div className="panel overflow-hidden p-4">
          <div className="mb-3 flex items-center justify-between">
            <AnimatePresence mode="wait">
              <motion.h3
                key={active.key}
                className="font-display text-lg font-bold"
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: 8 }}
                transition={{ duration: DURATION.fast, ease: EASE }}
              >
                {active.label} — leaders
              </motion.h3>
            </AnimatePresence>
            <span className="text-xs" style={{ color: "var(--fg-dim)" }}>
              ranked by today&apos;s move
            </span>
          </div>
          <RankedQuotes
            key={active.key}
            cacheKey={`sector-${active.key}`}
            symbols={active.constituents}
          />
        </div>
      )}
    </div>
  );
}
