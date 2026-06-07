"use client";

import { CandlestickChart, Lock } from "lucide-react";
import { useState } from "react";

const INTERVALS = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];

/**
 * Placeholder for the TradingView Advanced Charting Library (CLAUDE.md §6,
 * Phase 2). The real widget mounts here once the licensed library is dropped
 * into /public/charting_library and the /api/tv/* datafeed is wired.
 */
export function ChartPanel({ symbol }: { symbol: string }) {
  const [interval, setInterval] = useState("1D");

  return (
    <section className="panel flex h-[460px] flex-col p-0">
      <div className="flex items-center gap-1 border-b border-[var(--border)] px-4 py-2.5">
        <span className="mr-3 text-sm font-semibold">{symbol}</span>
        {INTERVALS.map((iv) => (
          <button
            key={iv}
            onClick={() => setInterval(iv)}
            className="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
            style={
              interval === iv
                ? { background: "var(--panel-2)", color: "var(--fg)" }
                : { color: "var(--fg-dim)" }
            }
          >
            {iv}
          </button>
        ))}
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "48px 40px",
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-3 text-center">
          <span
            className="grid h-12 w-12 place-items-center rounded-xl"
            style={{ background: "var(--panel-2)" }}
          >
            <CandlestickChart size={24} style={{ color: "var(--accent)" }} />
          </span>
          <div>
            <p className="text-sm font-semibold">TradingView Advanced Charts</p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-xs" style={{ color: "var(--fg-dim)" }}>
              <Lock size={12} /> Mounts here in Phase 2 · interval {interval}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
