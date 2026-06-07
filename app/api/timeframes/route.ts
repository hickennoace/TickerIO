import { NextRequest, NextResponse } from "next/server";
import { dailyCandles, quote } from "@/lib/market";
import { computeTimeframes } from "@/lib/finance/periods";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const [{ value: candles, resolved }, { value: q }] = await Promise.all([
      dailyCandles(symbol),
      quote(symbol),
    ]);

    const tz = resolved.assetClass === "equity" || resolved.assetClass === "index"
      ? q.exchangeTz
      : "UTC";

    const rows = computeTimeframes(
      candles.map((c) => ({ t: c.t, o: c.o, c: c.c })),
      q.price,
      tz,
      resolved.assetClass,
      Date.now(),
    );

    return NextResponse.json({
      symbol: resolved.symbol,
      display: resolved.display,
      currency: q.currency,
      price: q.price,
      rows,
      tz,
      asOf: q.asOf,
      source: "Yahoo Finance",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
