"use client";

import type { AssetClass } from "@/lib/types";
import { TradingViewChart } from "@/components/chart/TradingViewChart";

/**
 * Chart panel. The TradingView widget brings its own toolbar (symbol search,
 * intervals, drawing tools, indicators), so we don't duplicate those controls
 * here — just host the widget in a tall panel.
 */
export function ChartPanel({
  symbol,
  display,
  assetClass,
}: {
  symbol: string;
  display: string;
  assetClass: AssetClass;
}) {
  return (
    <section dir="ltr" className="panel h-[620px] overflow-hidden p-0">
      <TradingViewChart symbol={symbol} display={display} assetClass={assetClass} interval="D" />
    </section>
  );
}
