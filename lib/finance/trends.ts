/**
 * Multi-period trend analysis (pure). Turns annual income-statement history into
 * per-year margins, revenue/earnings CAGR and a margin-direction read, so the
 * dashboard can show whether a business is improving or deteriorating — not just
 * a single snapshot.
 */

import type { FinancialHistory } from "@/lib/providers/financials-history";

export interface TrendPoint {
  year: number;
  revenue: number | null;
  netIncome: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
}

export interface TrendSummary {
  points: TrendPoint[]; // ascending
  /** Compound annual growth, as a fraction (0.12 = 12%). Null if not computable. */
  revenueCagr: number | null;
  earningsCagr: number | null;
  netMarginFirst: number | null;
  netMarginLast: number | null;
  marginDirection: "expanding" | "stable" | "contracting" | null;
}

const margin = (part: number | null, whole: number | null): number | null =>
  part != null && whole != null && whole > 0 ? part / whole : null;

/** CAGR between the first and last positive values; null if either ≤ 0. */
function cagr(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null && isFinite(v));
  if (nums.length < 2) return null;
  const first = nums[0];
  const last = nums[nums.length - 1];
  if (first <= 0 || last <= 0) return null; // sign change → CAGR is meaningless
  const periods = nums.length - 1;
  return Math.pow(last / first, 1 / periods) - 1;
}

export function summarizeTrends(history: FinancialHistory): TrendSummary {
  const points: TrendPoint[] = history.years.map((y) => ({
    year: y.year,
    revenue: y.revenue,
    netIncome: y.netIncome,
    grossMargin: margin(y.grossProfit, y.revenue),
    operatingMargin: margin(y.operatingIncome, y.revenue),
    netMargin: margin(y.netIncome, y.revenue),
  }));

  const revenueCagr = cagr(points.map((p) => p.revenue));
  const earningsCagr = cagr(points.map((p) => p.netIncome));

  const netMargins = points.map((p) => p.netMargin).filter((m): m is number => m != null);
  const netMarginFirst = netMargins[0] ?? null;
  const netMarginLast = netMargins[netMargins.length - 1] ?? null;

  let marginDirection: TrendSummary["marginDirection"] = null;
  if (netMarginFirst != null && netMarginLast != null) {
    const delta = netMarginLast - netMarginFirst;
    marginDirection = delta > 0.02 ? "expanding" : delta < -0.02 ? "contracting" : "stable";
  }

  return { points, revenueCagr, earningsCagr, netMarginFirst, netMarginLast, marginDirection };
}
