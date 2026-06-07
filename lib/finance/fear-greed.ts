/**
 * Fear & Greed composite (CLAUDE.md §5.1).
 *
 * A 0..100 score from price action: momentum (vs moving averages), strength
 * (RSI-style up/down balance), and volatility (high vol → fear). For crypto we
 * blend in Alternative.me's industry-standard index when available.
 *
 * Pure. Returns sub-scores so the UI can explain the number.
 */

import type { Candle } from "@/lib/types";

export interface FearGreedBreakdown {
  score: number; // 0..100
  momentum: number;
  strength: number;
  volatility: number;
}

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/** RSI(14)-style 0..100. */
function rsi(closes: number[], period = 14): number {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (gains + losses === 0) return 50;
  const rs = gains / (losses || 1e-9);
  return 100 - 100 / (1 + rs);
}

function realizedVol(closes: number[], period: number): number {
  if (closes.length <= period) return 0;
  const rets: number[] = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance);
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function computeFearGreed(candles: Candle[]): FearGreedBreakdown {
  const closes = candles.map((c) => c.c).filter((n) => isFinite(n));
  if (closes.length < 20) {
    return { score: 50, momentum: 50, strength: 50, volatility: 50 };
  }

  const price = closes[closes.length - 1];
  const ma50 = sma(closes, 50) ?? sma(closes, Math.min(closes.length, 50)) ?? price;
  const ma200 = sma(closes, 200) ?? sma(closes, Math.min(closes.length, 100)) ?? price;

  // Momentum: how far above/below the averages (greedy when above).
  const aboveShort = (price / ma50 - 1) * 100;
  const aboveLong = (price / ma200 - 1) * 100;
  const momentum = clamp(50 + (aboveShort * 4 + aboveLong * 2));

  // Strength: RSI directly maps to fear/greed.
  const strength = clamp(rsi(closes, 14));

  // Volatility: recent vs baseline. Elevated vol → fear (low score).
  const recentVol = realizedVol(closes, 14);
  const baseVol = realizedVol(closes, Math.min(closes.length - 1, 90)) || recentVol || 1e-9;
  const volRatio = recentVol / baseVol; // >1 means elevated
  const volatility = clamp(50 - (volRatio - 1) * 50);

  const score = Math.round(clamp(momentum * 0.4 + strength * 0.35 + volatility * 0.25));
  return { score, momentum: Math.round(momentum), strength: Math.round(strength), volatility: Math.round(volatility) };
}

export function fgLabel(score: number): string {
  if (score < 25) return "Extreme Fear";
  if (score < 45) return "Fear";
  if (score < 55) return "Neutral";
  if (score < 75) return "Greed";
  return "Extreme Greed";
}
