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

export interface FinancialHistory {
  years: FinancialYear[];
}

export async function getFinancialHistory(
  symbol: string,
  assetClass: AssetClass,
): Promise<FinancialHistory | null> {
  if (assetClass !== "equity") return null;

  const result = await yahooQuoteSummary(symbol, ["incomeStatementHistory"]);
  const rows = (result?.incomeStatementHistory as { incomeStatementHistory?: Array<Record<string, unknown>> } | undefined)
    ?.incomeStatementHistory;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const years: FinancialYear[] = rows
    .map((r) => {
      const end = num((r.endDate as Record<string, unknown> | undefined)?.raw ?? r.endDate);
      const year = end ? new Date(end * 1000).getUTCFullYear() : NaN;
      return {
        year,
        revenue: num(r.totalRevenue),
        grossProfit: num(r.grossProfit),
        operatingIncome: num(r.operatingIncome),
        netIncome: num(r.netIncome),
      };
    })
    .filter((y) => Number.isFinite(y.year))
    .sort((a, b) => a.year - b.year); // ascending

  return years.length ? { years } : null;
}
