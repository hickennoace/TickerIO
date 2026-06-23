import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { getFundamentals } from "@/lib/providers/fundamentals";
import { scoreFundamentals } from "@/lib/finance/fundamental-score";
import { MOVERS_UNIVERSE } from "@/lib/markets/leaders";
import type { ScreenerRow, ScreenerResponse } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Equity universe (drop the crypto -USD pairs — no company fundamentals).
const UNIVERSE = MOVERS_UNIVERSE.filter((s) => !s.endsWith("-USD")).slice(0, 36);

/** Run an async map in small chunks so we don't fire 36 Yahoo calls at once. */
async function chunked<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

async function scoreRow(ticker: string): Promise<ScreenerRow | null> {
  const f = await cached(`peerfund:${ticker}`, 3600, () => getFundamentals(ticker, "equity"))
    .then((x) => x.value)
    .catch(() => null);
  if (!f || !f.available) return null;
  const s = scoreFundamentals(f);
  return {
    symbol: ticker,
    composite: s.composite.score,
    profitability: s.profitability.score,
    valuation: s.valuation.score,
    cashFlow: s.cashFlow.score,
    pe: f.trailingPE != null && f.trailingPE > 0 ? Math.round(f.trailingPE * 10) / 10 : null,
    netMarginPct: f.profitMargin != null ? Math.round(f.profitMargin * 1000) / 10 : null,
    revenueGrowthPct: f.revenueGrowth != null ? Math.round(f.revenueGrowth * 1000) / 10 : null,
    dividendYieldPct: f.dividendYield != null ? Math.round(f.dividendYield * 1000) / 10 : null,
  };
}

async function build(): Promise<ScreenerResponse> {
  const rows = (await chunked(UNIVERSE, 8, scoreRow)).filter((r): r is ScreenerRow => r !== null);
  rows.sort((a, b) => (b.composite ?? -1) - (a.composite ?? -1));
  return { rows, asOf: new Date().toISOString() };
}

export async function GET() {
  try {
    const { value } = await cached("screener:equities", 3600, build);
    return NextResponse.json(value);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
