"use client";

import { useEffect, useState } from "react";
import { MiniTicker } from "./MiniTicker";
import { useWatchlist } from "@/store/useWatchlist";

const BELLWETHERS: { symbol: string; label: string }[] = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^DJI", label: "Dow" },
  { symbol: "BTC", label: "Bitcoin" },
  { symbol: "ETH", label: "Ethereum" },
  { symbol: "EURUSD", label: "EUR/USD" },
];

export function MarketOverview() {
  const symbols = useWatchlist((s) => s.symbols);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
          Markets now
        </h2>
        <span className="text-[11px]" style={{ color: "var(--fg-dim)" }}>
          live · Yahoo Finance
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {BELLWETHERS.map((b) => (
          <MiniTicker key={b.symbol} symbol={b.symbol} label={b.label} />
        ))}
      </div>

      {mounted && symbols.length > 0 && (
        <>
          <div className="mb-3 mt-8 flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              Your watchlist
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {symbols.map((s) => (
              <MiniTicker key={s} symbol={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
