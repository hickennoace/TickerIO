/**
 * Anchored timeframe resolution (CLAUDE.md §4) — the heart of TickerIO.
 *
 * Each period's change is measured from the OPEN of that period's anchor, not
 * a rolling lookback. "Weekly" = this week's open. We bucket daily candles in
 * the asset's reference timezone (UTC for crypto/forex, exchange tz for
 * equities) and pick the *earliest* candle in the current period.
 *
 * Pure: callers inject `nowMs`. No network, no implicit clock.
 */

import type { AssetClass, TimeframeRow } from "@/lib/types";
import { pctChange, absChange } from "./change";
import { zonedParts } from "./sessions";

export interface DailyCandle {
  /** Epoch ms of the candle (Yahoo daily candles open at session/UTC start). */
  t: number;
  o: number;
  c: number;
}

interface AnchorPick {
  openPrice: number;
  at: number;
}

function isCrypto(assetClass: AssetClass): boolean {
  return assetClass === "crypto" || assetClass === "forex";
}

/**
 * Compute all anchored timeframe rows.
 * @param candles  Ascending daily candles (oldest first).
 * @param current  Latest price (regularMarketPrice).
 */
export function computeTimeframes(
  candles: DailyCandle[],
  current: number,
  tz: string,
  assetClass: AssetClass,
  nowMs: number,
): TimeframeRow[] {
  if (candles.length === 0) return [];

  const sorted = [...candles].sort((a, b) => a.t - b.t);
  const parts = sorted.map((c) => ({ c, p: zonedParts(c.t, tz) }));
  const nowParts = zonedParts(nowMs, tz);
  const last = sorted[sorted.length - 1];

  // earliest candle satisfying a predicate (period open), else null.
  const firstWhere = (
    pred: (z: ReturnType<typeof zonedParts>) => boolean,
  ): AnchorPick | null => {
    for (const { c, p } of parts) {
      if (pred(p)) return { openPrice: c.o, at: c.t };
    }
    return null;
  };

  // candle whose timestamp is closest to a target instant (for rolling 1Y).
  const closestTo = (targetMs: number): AnchorPick => {
    let best = sorted[0];
    let bestDiff = Math.abs(sorted[0].t - targetMs);
    for (const c of sorted) {
      const diff = Math.abs(c.t - targetMs);
      if (diff < bestDiff) {
        best = c;
        bestDiff = diff;
      }
    }
    return { openPrice: best.o, at: best.t };
  };

  const crypto = isCrypto(assetClass);

  const dayPick =
    firstWhere((z) => z.dayKey === nowParts.dayKey) ?? { openPrice: last.o, at: last.t };
  const weekPick =
    firstWhere((z) => z.weekKey === nowParts.weekKey) ?? dayPick;
  const monthPick =
    firstWhere((z) => z.year === nowParts.year && z.month === nowParts.month) ?? weekPick;
  const quarterPick =
    firstWhere((z) => z.year === nowParts.year && z.quarter === nowParts.quarter) ?? monthPick;
  const ytdPick = firstWhere((z) => z.year === nowParts.year) ?? quarterPick;
  const yearPick = closestTo(nowMs - 365 * 24 * 3600 * 1000);

  const rows: Array<{ label: string; anchor: string; pick: AnchorPick }> = [
    { label: "Day", anchor: crypto ? "today 00:00 UTC" : "session open", pick: dayPick },
    { label: "Week", anchor: crypto ? "Mon 00:00 UTC" : "week open", pick: weekPick },
    { label: "Month", anchor: crypto ? "1st 00:00 UTC" : "month open", pick: monthPick },
    { label: "Quarter", anchor: crypto ? "Q open UTC" : "quarter open", pick: quarterPick },
    { label: "YTD", anchor: crypto ? "Jan 1 00:00 UTC" : "year open", pick: ytdPick },
    { label: "1Y", anchor: "1 year ago", pick: yearPick },
  ];

  return rows.map(({ label, anchor, pick }): TimeframeRow => ({
    label,
    anchor,
    anchorAt: new Date(pick.at).toISOString(),
    changePct: pctChange(current, pick.openPrice),
    changeAbs: absChange(current, pick.openPrice),
  }));
}
