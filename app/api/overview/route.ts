import { NextRequest, NextResponse } from "next/server";
import { resolve, quote, dailyCandles } from "@/lib/market";
import { cached } from "@/lib/cache";
import { computeTimeframes } from "@/lib/finance/periods";
import { computeFearGreed, fgLabel } from "@/lib/finance/fear-greed";
import { technicalScore, computeTrendBias } from "@/lib/finance/trend-bias";
import { getCryptoFng } from "@/lib/providers/altfng";
import type { OverviewResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Consolidated dashboard read: one daily-candle fetch powers the anchored
 * timeframes, the Fear & Greed gauge and the trend-bias indicator, instead of
 * three separate routes each re-pulling the 2-year series. The live price stays
 * on its own /api/quote + SSE stream.
 */
async function build(symbolInput: string): Promise<OverviewResponse> {
  const r = resolve(symbolInput);
  const [{ value: q }, { value: candles }] = await Promise.all([quote(symbolInput), dailyCandles(symbolInput)]);

  const tz = r.assetClass === "equity" || r.assetClass === "index" ? q.exchangeTz : "UTC";
  const rows = computeTimeframes(
    candles.map((c) => ({ t: c.t, o: c.o, c: c.c })),
    q.price,
    tz,
    r.assetClass,
    Date.now(),
  );

  const fg = computeFearGreed(candles);
  let fgScore = fg.score;
  let fgSource = "TickerIO composite";
  if (r.assetClass === "crypto") {
    try {
      const { value: ext } = await cached("fng:crypto", 3600, getCryptoFng);
      fgScore = Math.round(fg.score * 0.5 + ext.score * 0.5);
      fgSource = "Alternative.me + TickerIO";
    } catch {
      /* price-action only */
    }
  }

  const bias = computeTrendBias(technicalScore(candles), Math.round((fgScore - 50) * 2));

  return {
    timeframes: { rows, currency: q.currency, tz, source: "Yahoo Finance" },
    sentiment: { score: fgScore, label: fgLabel(fgScore), breakdown: fg, source: fgSource },
    trendBias: { ...bias, source: "TickerIO engine" },
    asOf: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  try {
    const r = resolve(symbol);
    const { value } = await cached(`overview:${r.symbol}`, 60, () => build(symbol));
    return NextResponse.json(value);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
