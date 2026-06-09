"use client";

import { useState } from "react";
import { Flame, Gauge, LayoutGrid, Bitcoin, Gem } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SectorBoard } from "./SectorBoard";
import { RankedQuotes } from "./RankedQuotes";
import { MoversBoard } from "./MoversBoard";
import { RangeScanBoard } from "./RangeScanBoard";
import { CRYPTO_LEADERS, COMMODITIES } from "@/lib/markets/leaders";
import { DURATION, EASE, fadeUp, staggerContainer } from "@/lib/motion";

type Tab = "movers" | "sectors" | "crypto" | "commodities" | "range";

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "movers", label: "Movers", icon: Flame },
  { key: "sectors", label: "Sectors", icon: LayoutGrid },
  { key: "crypto", label: "Crypto", icon: Bitcoin },
  { key: "commodities", label: "Commodities", icon: Gem },
  { key: "range", label: "52-Wk Range", icon: Gauge },
];

export function MarketsClient() {
  const [tab, setTab] = useState<Tab>("movers");
  const reduce = useReducedMotion();

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Market Leaders</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Who&apos;s leading today — across sectors, crypto, and commodities.
        </p>
      </div>

      {/* Tab bar — the active pill glides between tabs via shared layout.
          Wrapped so the 5 pills scroll horizontally instead of overflowing on mobile. */}
      <div className="mb-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1">
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              style={{ color: on ? "#fff" : "var(--fg-muted)" }}
            >
              {on && (
                <motion.span
                  layoutId="markets-tab-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: "var(--accent)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <t.icon size={15} />
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: DURATION.base, ease: EASE }}
        >
          {tab === "movers" && <MoversBoard />}

          {tab === "sectors" && <SectorBoard />}

          {tab === "range" && <RangeScanBoard />}

          {tab === "crypto" && (
            <div className="panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Leading coins</h2>
                <span className="text-xs" style={{ color: "var(--fg-dim)" }}>
                  top coins ranked by today&apos;s move
                </span>
              </div>
              <RankedQuotes cacheKey="crypto-leaders" symbols={CRYPTO_LEADERS} />
            </div>
          )}

          {tab === "commodities" && (
            <motion.div
              className="grid gap-4 lg:grid-cols-3"
              variants={staggerContainer(0.08)}
              initial="hidden"
              animate="show"
            >
              {COMMODITIES.map((g) => (
                <motion.div key={g.group} variants={fadeUp} className="panel p-4">
                  <h2 className="mb-3 font-display text-lg font-bold">{g.group}</h2>
                  <RankedQuotes
                    cacheKey={`commodities-${g.group.toLowerCase()}`}
                    symbols={g.items.map((i) => i.symbol)}
                    showRank={false}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="mt-8 text-center text-xs" style={{ color: "var(--fg-dim)" }}>
        Curated large-cap universe · ranked by today&apos;s % change · Yahoo Finance · not financial advice.
      </p>
    </main>
  );
}
