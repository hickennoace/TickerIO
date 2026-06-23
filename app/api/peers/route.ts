import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { resolve } from "@/lib/market";
import { getFundamentals } from "@/lib/providers/fundamentals";
import { scoreFundamentals } from "@/lib/finance/fundamental-score";
import { SECTORS } from "@/lib/markets/leaders";
import type { PeerRow, PeersResponse } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_PEERS = 7;

/** Find the curated sector whose constituents include this ticker. */
function sectorFor(symbol: string): { label: string; peers: string[] } | null {
  const s = symbol.toUpperCase();
  for (const sec of SECTORS) {
    if (sec.constituents.includes(s)) {
      return { label: sec.label, peers: sec.constituents.filter((c) => c !== s) };
    }
  }
  return null;
}

async function scoreOne(ticker: string): Promise<{ symbol: string; composite: number | null; pe: number | null; netMargin: number | null; revGrowth: number | null }> {
  const f = await cached(`peerfund:${ticker}`, 3600, () => getFundamentals(ticker, "equity")).then((x) => x.value);
  const composite = f.available ? scoreFundamentals(f).composite.score : null;
  return { symbol: ticker, composite, pe: f.trailingPE, netMargin: f.profitMargin, revGrowth: f.revenueGrowth };
}

async function build(symbolInput: string): Promise<PeersResponse> {
  const r = resolve(symbolInput);
  const sec = r.assetClass === "equity" ? sectorFor(r.symbol) : null;
  if (!sec) {
    return { symbol: r.symbol, sector: null, compositePercentile: null, rows: [] };
  }

  const tickers = [r.symbol, ...sec.peers.slice(0, MAX_PEERS)];
  const scored = await Promise.all(
    tickers.map((t) => scoreOne(t).catch(() => ({ symbol: t, composite: null, pe: null, netMargin: null, revGrowth: null }))),
  );

  const rows: PeerRow[] = scored
    .map((s) => ({
      symbol: s.symbol,
      display: s.symbol,
      composite: s.composite,
      pePct: s.pe != null && s.pe > 0 ? s.pe.toFixed(1) : null,
      netMarginPct: s.netMargin != null ? Math.round(s.netMargin * 1000) / 10 : null,
      revenueGrowthPct: s.revGrowth != null ? Math.round(s.revGrowth * 1000) / 10 : null,
      isTarget: s.symbol === r.symbol,
    }))
    .sort((a, b) => (b.composite ?? -1) - (a.composite ?? -1));

  // Percentile of the target's composite among peers that have one.
  const comps = rows.map((x) => x.composite).filter((c): c is number => c != null);
  const target = rows.find((x) => x.isTarget)?.composite ?? null;
  const compositePercentile =
    target != null && comps.length > 1
      ? Math.round((comps.filter((c) => c <= target).length - 1) / (comps.length - 1) * 100)
      : null;

  return { symbol: r.symbol, sector: sec.label, compositePercentile, rows };
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  try {
    const r = resolve(symbol);
    const { value } = await cached(`peers:${r.symbol}`, 3600, () => build(symbol));
    return NextResponse.json(value);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
