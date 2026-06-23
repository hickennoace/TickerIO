import { NextRequest, NextResponse } from "next/server";
import { intradayCandles } from "@/lib/market";
import type { CandleSeries } from "@/lib/types";

export const dynamic = "force-dynamic";

const RANGES = new Set(["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"]);
const INTERVALS = new Set(["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"]);

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const symbol = params.get("symbol");
  const range = params.get("range") ?? "1d";
  const interval = params.get("interval") ?? "5m";
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  if (!RANGES.has(range) || !INTERVALS.has(interval)) {
    return NextResponse.json({ error: "invalid range/interval" }, { status: 400 });
  }

  try {
    const { value, stale, resolved } = await intradayCandles(symbol, range, interval);
    const body: CandleSeries & { stale: boolean } = {
      symbol: resolved.symbol,
      interval,
      range,
      candles: value,
      asOf: new Date().toISOString(),
      source: "Yahoo Finance",
      stale,
    };
    return NextResponse.json(body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
