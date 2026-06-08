/**
 * Batch quotes — fan out over a comma-separated symbol list and return a
 * lightweight quote for each. Powers the `/markets` Leaders board (sector
 * heatmap, crypto/commodity rankings) without N client round-trips.
 *
 * Each symbol resolves through the same cached per-symbol `quote()` service
 * (lib/market.ts), so popular symbols are served warm and we never hammer
 * Yahoo. Failures are dropped silently — a board never blanks on one bad name.
 */

import { NextRequest, NextResponse } from "next/server";
import { quote } from "@/lib/market";
import { COMMODITY_NAMES } from "@/lib/markets/leaders";
import type { MiniQuote } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_SYMBOLS = 60;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols")?.trim() ?? "";
  const symbols = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).slice(0, MAX_SYMBOLS);

  if (symbols.length === 0) return NextResponse.json({ quotes: [] });

  const settled = await Promise.allSettled(symbols.map((s) => quote(s)));

  const quotes: MiniQuote[] = [];
  let anyStale = false;
  settled.forEach((res, i) => {
    if (res.status !== "fulfilled") return;
    const { value: q, stale } = res.value;
    if (stale) anyStale = true;
    quotes.push({
      symbol: q.symbol,
      display: q.display,
      name: COMMODITY_NAMES[symbols[i]] ?? q.name,
      assetClass: q.assetClass,
      currency: q.currency,
      price: q.price,
      changePct: q.changePct,
      change: q.change,
    });
  });

  return NextResponse.json({ quotes, stale: anyStale, asOf: new Date().toISOString() });
}
