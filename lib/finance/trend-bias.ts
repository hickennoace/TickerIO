/**
 * Trend bias (CLAUDE.md §5.3): technical momentum × market sentiment → a single
 * directional read in [-100, 100], plus the component scores for transparency.
 * Weighted 60% technical / 40% sentiment.
 */

import type { Candle, TrendBiasResult } from "@/lib/types";

const clamp = (n: number, lo = -100, hi = 100) => Math.max(lo, Math.min(hi, n));

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  return values.slice(-period).reduce((a, b) => a + b, 0) / period;
}

/** Technical momentum in [-100,100] from MA structure + rate of change. */
export function technicalScore(candles: Candle[]): number {
  const closes = candles.map((c) => c.c).filter(isFinite);
  if (closes.length < 20) return 0;
  const price = closes[closes.length - 1];
  const ma20 = sma(closes, 20) ?? price;
  // Only apply MA terms backed by real history — never compare against a
  // full-length average masquerading as a 50/200-day MA (that charged a phantom
  // death-cross on short series).
  const ma50 = closes.length >= 50 ? sma(closes, 50) : null;
  const ma200 = closes.length >= 200 ? sma(closes, 200) : null;

  let score = 0;
  score += price > ma20 ? 20 : -20;
  if (ma50 != null) {
    score += price > ma50 ? 20 : -20;
    score += ma20 > ma50 ? 15 : -15; // short above mid = uptrend
  }
  if (ma50 != null && ma200 != null) {
    score += ma50 > ma200 ? 15 : -15; // golden/death cross bias
  }

  // 20-day rate of change (guarded: a zero/invalid base must not blow the score to ±30).
  const past = closes[closes.length - 21] ?? closes[0];
  const roc = past > 0 ? ((price - past) / past) * 100 : 0;
  score += clamp(roc * 2, -30, 30);

  return Math.round(clamp(score));
}

/**
 * Combine technical with a sentiment score (also -100..100; derive from the
 * Fear & Greed 0..100 via (fg-50)*2, optionally nudged by news tilt).
 */
export function computeTrendBias(technical: number, sentiment: number): TrendBiasResult {
  const bias = Math.round(clamp(technical * 0.6 + sentiment * 0.4));
  return { bias, technical, sentiment, label: biasLabel(bias) };
}

export function biasLabel(bias: number): string {
  if (bias <= -60) return "Strong Bearish";
  if (bias < -20) return "Bearish";
  if (bias <= 20) return "Neutral";
  if (bias < 60) return "Bullish";
  return "Strong Bullish";
}
