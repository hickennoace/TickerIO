"use client";

import { useState } from "react";
import { LayoutGrid, Bitcoin, Gem } from "lucide-react";
import { SectorBoard } from "./SectorBoard";
import { RankedQuotes } from "./RankedQuotes";
import { CRYPTO_LEADERS, COMMODITIES } from "@/lib/markets/leaders";

type Tab = "sectors" | "crypto" | "commodities";

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "sectors", label: "Sectors", icon: LayoutGrid },
  { key: "crypto", label: "Crypto", icon: Bitcoin },
  { key: "commodities", label: "Commodities", icon: Gem },
];

export function MarketsClient() {
  const [tab, setTab] = useState<Tab>("sectors");

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Market Leaders</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Who&apos;s leading today — across sectors, crypto, and commodities.
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 inline-flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1">
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                background: on ? "var(--accent)" : "transparent",
                color: on ? "#fff" : "var(--fg-muted)",
              }}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "sectors" && <SectorBoard />}

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
        <div className="grid gap-4 lg:grid-cols-3">
          {COMMODITIES.map((g) => (
            <div key={g.group} className="panel p-4">
              <h2 className="mb-3 font-display text-lg font-bold">{g.group}</h2>
              <RankedQuotes
                cacheKey={`commodities-${g.group.toLowerCase()}`}
                symbols={g.items.map((i) => i.symbol)}
                showRank={false}
              />
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs" style={{ color: "var(--fg-dim)" }}>
        Curated large-cap universe · ranked by today&apos;s % change · Yahoo Finance · not financial advice.
      </p>
    </main>
  );
}
