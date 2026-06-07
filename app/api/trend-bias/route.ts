import { NextRequest, NextResponse } from "next/server";
import { dailyCandles } from "@/lib/market";
import { computeFearGreed } from "@/lib/finance/fear-greed";
import { technicalScore, computeTrendBias } from "@/lib/finance/trend-bias";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const { value: candles } = await dailyCandles(symbol);
    const technical = technicalScore(candles);
    // Sentiment proxy: map Fear & Greed (0..100) into [-100,100].
    const fg = computeFearGreed(candles);
    const sentiment = Math.round((fg.score - 50) * 2);
    const result = computeTrendBias(technical, sentiment);

    return NextResponse.json({ ...result, source: "TickerIO engine", asOf: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
