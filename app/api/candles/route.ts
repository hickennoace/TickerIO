import { NextRequest, NextResponse } from "next/server";
import { intradayCandles } from "@/lib/market";
import type { CandleSeries } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const symbol = params.get("symbol");
  const range = params.get("range") ?? "1d";
  const interval = params.get("interval") ?? "5m";
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

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
