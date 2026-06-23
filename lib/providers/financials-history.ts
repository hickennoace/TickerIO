/**
 * Multi-year financial history — annual income-statement lines from Yahoo
 * `quoteSummary` `incomeStatementHistory` (the cashflow/balance history modules
 * now come back empty, so we build trends from the income statement, which is
 * still rich: revenue, gross/operating/net income for ~4 fiscal years).
 *
 * Returns years ASCENDING (oldest → newest), or null for non-equities / when
 * Yahoo can't cover the symbol, so callers degrade gracefully.
 */

import { yahooQuoteSummary } from "@/lib/providers/yahoo-auth";
import type { AssetClass } from "@/lib/types";

function num(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (v && typeof v === "object" && "raw" in v) {
    const r = (v as { raw?: unknown }).raw;
    return typeof r === "number" && isFinite(r) ? r : null;
  }
  return null;
}

export interface FinancialYear {
  year: number;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
}

export interface EarningsInfo {
  /** Next scheduled/expected earnings date (epoch ms), or null. */
  nextDateMs: number | null;
  isEstimate: boolean;
  /** Recent quarterly EPS surprises as fractions (0.1 = +10% beat), oldest→newest. */
  surprises: number[];
}

export interface FinancialHistory {
  years: FinancialYear[];
  /** Latest fiscal year EBIT + interest expense — for the interest-coverage ratio. */
  latestEbit: number | null;
  latestInterestExpense: number | null;
  earnings: EarningsInfo | null;
}

export async function getFinancialHistory(
  symbol: string,
  assetClass: AssetClass,
): Promise<FinancialHistory | null> {
  if (assetClass !== "equity") return null;

  const result = await yahooQuoteSummary(symbol, [
    "incomeStatementHistory",
    "calendarEvents",
    "earningsHistory",
  ]);
  const rows = (result?.incomeStatementHistory as { incomeStatementHistory?: Array<Record<string, unknown>> } | undefined)
    ?.incomeStatementHistory;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const parsed = rows
    .map((r) => {
      const end = num((r.endDate as Record<string, unknown> | undefined)?.raw ?? r.endDate);
      const year = end ? new Date(end * 1000).getUTCFullYear() : NaN;
      return {
        year,
        revenue: num(r.totalRevenue),
        grossProfit: num(r.grossProfit),
        operatingIncome: num(r.operatingIncome),
        netIncome: num(r.netIncome),
        ebit: num(r.ebit) ?? num(r.operatingIncome),
        interestExpense: num(r.interestExpense),
      };
    })
    .filter((y) => Number.isFinite(y.year))
    .sort((a, b) => a.year - b.year); // ascending

  if (!parsed.length) return null;

  const years: FinancialYear[] = parsed.map(({ year, revenue, grossProfit, operatingIncome, netIncome }) => ({
    year, revenue, grossProfit, operatingIncome, netIncome,
  }));
  const latest = parsed[parsed.length - 1];

  // Earnings calendar + beat/miss history.
  const ce = (result?.calendarEvents as { earnings?: Record<string, unknown> } | undefined)?.earnings;
  const dates = Array.isArray(ce?.earningsDate) ? ce?.earningsDate : [];
  const nextDateRaw = dates.length ? num((dates[0] as Record<string, unknown>)?.raw ?? dates[0]) : null;
  const histRows = (result?.earningsHistory as { history?: Array<Record<string, unknown>> } | undefined)?.history ?? [];
  const surprises = histRows
    .map((h) => num(h.surprisePercent))
    .filter((v): v is number => v != null);
  const earnings: EarningsInfo | null = nextDateRaw || surprises.length
    ? { nextDateMs: nextDateRaw ? nextDateRaw * 1000 : null, isEstimate: ce?.isEarningsDateEstimate === true, surprises }
    : null;

  return { years, latestEbit: latest.ebit, latestInterestExpense: latest.interestExpense, earnings };
}
