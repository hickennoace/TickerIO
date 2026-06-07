/**
 * DEMO DATA — deterministic, seeded from the ticker symbol.
 *
 * This is a placeholder so the UI is fully alive before Phase 1 wires real
 * market-data providers (see CLAUDE.md §6, Phase 1). Per the "no silent data
 * lies" rule (§1.2.3), every surface that uses this is labeled "DEMO".
 *
 * Nothing here is financial truth. Replace with /api/* responses in Phase 1.
 */

import type { Direction } from "./format";

export type AssetClass = "crypto" | "equity";

export interface TimeframeChange {
  label: string;
  /** Percent change vs. the anchored period open (§4). */
  changePct: number;
  /** Absolute change in quote currency. */
  changeAbs: number;
  /** UTC anchor description shown to the user, e.g. "Mon 00:00 UTC". */
  anchor: string;
}

export interface NewsItem {
  id: string;
  source: string;
  headline: string;
  minutesAgo: number;
  sentiment: Direction;
}

export interface DemoSnapshot {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  price: number;
  dayChangePct: number;
  dayChangeAbs: number;
  timeframes: TimeframeChange[];
  sparkline: number[];
  fearGreed: number; // 0..100
  trendBias: number; // -100..100
  techScore: number; // -100..100
  sentScore: number; // -100..100
  news: NewsItem[];
}

const CRYPTO = new Set([
  "BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "BNB", "AVAX", "LINK", "DOT", "MATIC", "LTC",
]);

const NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  TSLA: "Tesla, Inc.",
  NVDA: "NVIDIA Corporation",
  MSFT: "Microsoft Corporation",
  AMZN: "Amazon.com, Inc.",
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
};

/** Tiny deterministic string hash → 32-bit int. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 seeded PRNG → deterministic per symbol. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isCrypto(symbol: string): boolean {
  return CRYPTO.has(symbol.toUpperCase());
}

export function getDemoSnapshot(rawSymbol: string): DemoSnapshot {
  const symbol = rawSymbol.toUpperCase().slice(0, 8);
  const crypto = isCrypto(symbol);
  const r = rng(hash(symbol));

  // Base price scaled by asset class for plausibility.
  const basePrice = crypto
    ? symbol === "BTC"
      ? 60000 + r() * 40000
      : symbol === "ETH"
      ? 2500 + r() * 2000
      : 0.5 + r() * 300
    : 40 + r() * 460;

  const dayChangePct = (r() - 0.45) * 6;
  const price = basePrice;
  const dayChangeAbs = (price * dayChangePct) / 100;

  const mkTf = (label: string, anchor: string, spread: number): TimeframeChange => {
    const changePct = (r() - 0.45) * spread;
    return {
      label,
      anchor,
      changePct,
      changeAbs: (price * changePct) / 100,
    };
  };

  const timeframes: TimeframeChange[] = [
    mkTf("Day", crypto ? "00:00 UTC" : "Session open", 6),
    mkTf("Week", crypto ? "Mon 00:00 UTC" : "Week open", 12),
    mkTf("Month", crypto ? "1st 00:00 UTC" : "Month open", 22),
    mkTf("YTD", crypto ? "Jan 1 00:00 UTC" : "Year open", 80),
  ];

  // Sparkline — 48 points trending toward dayChange.
  const sparkline: number[] = [];
  let v = price - dayChangeAbs;
  for (let i = 0; i < 48; i++) {
    v += (dayChangeAbs / 48) + (r() - 0.5) * price * 0.004;
    sparkline.push(v);
  }

  const fearGreed = Math.round(20 + r() * 60);
  const techScore = Math.round((r() - 0.4) * 160);
  const sentScore = Math.round((r() - 0.45) * 160);
  const trendBias = Math.round(
    Math.max(-100, Math.min(100, techScore * 0.6 + sentScore * 0.4)),
  );

  const headlines = [
    "Analysts raise price target ahead of earnings",
    "Volume spikes as buyers step in at key support",
    "Macro data shifts rate-cut expectations",
    "Options flow signals elevated near-term volatility",
    "Sector rotation lifts momentum names",
  ];
  const sources = ["Bloomberg", "Reuters", "WSJ", "CoinDesk", "FT"];
  const news: NewsItem[] = headlines.slice(0, 4).map((headline, i) => ({
    id: `${symbol}-${i}`,
    source: sources[Math.floor(r() * sources.length)],
    headline,
    minutesAgo: Math.floor(5 + r() * 600),
    sentiment: r() > 0.6 ? "up" : r() > 0.3 ? "flat" : "down",
  }));

  return {
    symbol,
    name: NAMES[symbol] ?? (crypto ? `${symbol} / USD` : symbol),
    assetClass: crypto ? "crypto" : "equity",
    price,
    dayChangePct,
    dayChangeAbs,
    timeframes,
    sparkline,
    fearGreed,
    trendBias,
    techScore,
    sentScore,
    news,
  };
}
