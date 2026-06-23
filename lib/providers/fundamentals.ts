/**
 * Fundamentals provider — company financials from Yahoo Finance `quoteSummary`.
 *
 * Pulls the modules that feed the four analysis pillars (profitability,
 * valuation, cash flow, financial strength) plus forward/analyst data, and
 * normalizes Yahoo's `{ raw, fmt }` wrappers into a flat, typed numbers object.
 *
 * Only equities carry these figures; crypto/forex/indices return
 * `{ available: false }` so the UI degrades to a market + news read.
 */

import { yahooQuoteSummary } from "@/lib/providers/yahoo-auth";
import type { AssetClass } from "@/lib/types";

/** Yahoo wraps most numbers as `{ raw, fmt }`; sometimes they're bare. */
function num(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (v && typeof v === "object" && "raw" in v) {
    const r = (v as { raw?: unknown }).raw;
    return typeof r === "number" && isFinite(r) ? r : null;
  }
  return null;
}

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

/** Yahoo's summaryDetail.dividendYield is sometimes a fraction (0.0052) and
 *  sometimes already a percent (e.g. 2.1). A "fraction" > 1 would be a >100%
 *  yield (impossible), so treat anything > 1 as a percent and rescale. */
function normYield(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  return n > 1 ? n / 100 : n;
}

/** Flat, normalized fundamental figures. All optional — many stocks lack some. */
export interface Fundamentals {
  available: boolean;
  assetClass: AssetClass;
  currency: string;

  // Profitability
  profitMargin: number | null; // net
  grossMargin: number | null;
  operatingMargin: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  ebitda: number | null;
  netIncome: number | null;

  // Valuation
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  enterpriseToEbitda: number | null;
  enterpriseToRevenue: number | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  sharesOutstanding: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  beta: number | null;

  // Cash flow
  freeCashflow: number | null;
  operatingCashflow: number | null;
  totalRevenue: number | null;

  // Financial strength
  totalCash: number | null;
  totalDebt: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  quickRatio: number | null;

  // Growth / forward
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  trailingEps: number | null;
  forwardEps: number | null;
  nextYearEpsGrowth: number | null;
  nextYearRevenueGrowth: number | null;
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  currentPrice: number | null;
  recommendationKey: string | null;
  numberOfAnalysts: number | null;
}

function empty(assetClass: AssetClass, currency = "USD"): Fundamentals {
  return {
    available: false,
    assetClass,
    currency,
    profitMargin: null, grossMargin: null, operatingMargin: null,
    returnOnEquity: null, returnOnAssets: null, ebitda: null, netIncome: null,
    trailingPE: null, forwardPE: null, pegRatio: null, priceToBook: null,
    priceToSales: null, enterpriseToEbitda: null, enterpriseToRevenue: null,
    marketCap: null, enterpriseValue: null, sharesOutstanding: null, dividendYield: null, payoutRatio: null, beta: null,
    freeCashflow: null, operatingCashflow: null, totalRevenue: null,
    totalCash: null, totalDebt: null, debtToEquity: null, currentRatio: null, quickRatio: null,
    revenueGrowth: null, earningsGrowth: null, trailingEps: null, forwardEps: null,
    nextYearEpsGrowth: null, nextYearRevenueGrowth: null,
    targetMeanPrice: null, targetHighPrice: null, targetLowPrice: null, currentPrice: null,
    recommendationKey: null, numberOfAnalysts: null,
  };
}

const MODULES = [
  "financialData",
  "defaultKeyStatistics",
  "summaryDetail",
  "price",
  "earningsTrend",
];

/**
 * Fetch + normalize fundamentals for an equity symbol. Non-equities and
 * symbols Yahoo can't cover return `{ available: false }`.
 */
export async function getFundamentals(
  symbol: string,
  assetClass: AssetClass,
): Promise<Fundamentals> {
  if (assetClass !== "equity") return empty(assetClass);

  const result = await yahooQuoteSummary(symbol, MODULES);
  if (!result) return empty(assetClass);

  const fd = (result.financialData ?? {}) as Record<string, unknown>;
  const ks = (result.defaultKeyStatistics ?? {}) as Record<string, unknown>;
  const sd = (result.summaryDetail ?? {}) as Record<string, unknown>;
  const pr = (result.price ?? {}) as Record<string, unknown>;
  const et = (result.earningsTrend ?? {}) as { trend?: Array<Record<string, unknown>> };

  // earningsTrend: pick the next full fiscal year (+1y) for forward growth.
  const trend = Array.isArray(et.trend) ? et.trend : [];
  const nextYear = trend.find((t) => t.period === "+1y");
  const nextYearEpsGrowth = nextYear ? num(nextYear.growth) : null;
  const nextYearRevenueGrowth = nextYear
    ? num((nextYear.revenueEstimate as Record<string, unknown> | undefined)?.growth)
    : null;

  const currency =
    str(pr.currency) ?? str(sd.currency) ?? str((fd as Record<string, unknown>).financialCurrency) ?? "USD";

  const f: Fundamentals = {
    available: true,
    assetClass,
    currency,

    profitMargin: num(fd.profitMargins) ?? num(ks.profitMargins),
    grossMargin: num(fd.grossMargins),
    operatingMargin: num(fd.operatingMargins),
    returnOnEquity: num(fd.returnOnEquity),
    returnOnAssets: num(fd.returnOnAssets),
    ebitda: num(fd.ebitda),
    netIncome: num(ks.netIncomeToCommon),

    trailingPE: num(sd.trailingPE),
    forwardPE: num(sd.forwardPE) ?? num(ks.forwardPE),
    pegRatio: num(ks.pegRatio),
    priceToBook: num(ks.priceToBook),
    priceToSales: num(sd.priceToSalesTrailing12Months),
    enterpriseToEbitda: num(ks.enterpriseToEbitda),
    enterpriseToRevenue: num(ks.enterpriseToRevenue),
    marketCap: num(sd.marketCap) ?? num(pr.marketCap),
    enterpriseValue: num(ks.enterpriseValue),
    sharesOutstanding: num(ks.sharesOutstanding),
    dividendYield: normYield(sd.dividendYield),
    payoutRatio: num(sd.payoutRatio),
    beta: num(sd.beta) ?? num(ks.beta),

    freeCashflow: num(fd.freeCashflow),
    operatingCashflow: num(fd.operatingCashflow),
    totalRevenue: num(fd.totalRevenue),

    totalCash: num(fd.totalCash),
    totalDebt: num(fd.totalDebt),
    debtToEquity: num(fd.debtToEquity),
    currentRatio: num(fd.currentRatio),
    quickRatio: num(fd.quickRatio),

    revenueGrowth: num(fd.revenueGrowth),
    earningsGrowth: num(fd.earningsGrowth),
    trailingEps: num(ks.trailingEps),
    forwardEps: num(ks.forwardEps),
    nextYearEpsGrowth,
    nextYearRevenueGrowth,
    targetMeanPrice: num(fd.targetMeanPrice),
    targetHighPrice: num(fd.targetHighPrice),
    targetLowPrice: num(fd.targetLowPrice),
    currentPrice: num(fd.currentPrice) ?? num(pr.regularMarketPrice),
    recommendationKey: str(fd.recommendationKey),
    numberOfAnalysts: num(fd.numberOfAnalystOpinions),
  };

  // If Yahoo returned the modules but every figure is missing, treat as N/A.
  const anyValue = Object.entries(f).some(
    ([k, v]) => !["available", "assetClass", "currency"].includes(k) && v != null,
  );
  return anyValue ? f : empty(assetClass, currency);
}
