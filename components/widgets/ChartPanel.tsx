"use client";

import { useState } from "react";
import type { AssetClass } from "@/lib/types";
import { TradingViewChart } from "@/components/chart/TradingViewChart";

const INTERVALS: { label: string; tv: string }[] = [
  { label: "5m", tv: "5" },
  { label: "15m", tv: "15" },
  { label: "1H", tv: "60" },
  { label: "4H", tv: "240" },
  { label: "1D", tv: "D" },
  { label: "1W", tv: "W" },
];

export function ChartPanel({
  symbol,
  display,
  assetClass,
}: {
  symbol: string;
  display: string;
  assetClass: AssetClass;
}) {
  const [interval, setInterval] = useState("D");

  return (
    <section className="panel flex h-[480px] flex-col overflow-hidden p-0">
      <div className="flex items-center gap-1 border-b border-[var(--border)] px-4 py-2.5">
        <span className="mr-3 text-sm font-semibold">{display}</span>
        {INTERVALS.map((iv) => (
          <button
            key={iv.tv}
            onClick={() => setInterval(iv.tv)}
            className="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
            style={
              interval === iv.tv
                ? { background: "var(--panel-2)", color: "var(--fg)" }
                : { color: "var(--fg-dim)" }
            }
          >
            {iv.label}
          </button>
        ))}
        <span className="ml-auto text-[11px]" style={{ color: "var(--fg-dim)" }}>
          TradingView · drawing tools enabled
        </span>
      </div>
      <div className="relative flex-1">
        <TradingViewChart
          symbol={symbol}
          display={display}
          assetClass={assetClass}
          interval={interval}
        />
      </div>
    </section>
  );
}
