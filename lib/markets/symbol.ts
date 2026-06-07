/**
 * Symbol resolution & classification.
 *
 * Maps a user-typed ticker to the provider (Yahoo) symbol and infers asset
 * class, reference timezone, and a clean display label. Pure + deterministic.
 */

import type { AssetClass } from "@/lib/types";

const CRYPTO = new Set([
  "BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "BNB", "AVAX", "LINK", "DOT",
  "MATIC", "LTC", "BCH", "TRX", "SHIB", "UNI", "ATOM", "XLM", "NEAR", "APT",
  "ARB", "OP", "FIL", "ICP", "INJ", "SUI", "SEI", "TIA", "RNDR", "PEPE",
]);

const FOREX = new Set([
  "EUR", "USD", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "CNY", "HKD",
]);

const INDICES: Record<string, string> = {
  SPX: "^GSPC",
  SP500: "^GSPC",
  NDX: "^NDX",
  NASDAQ: "^IXIC",
  DJI: "^DJI",
  DOW: "^DJI",
  VIX: "^VIX",
  RUT: "^RUT",
  FTSE: "^FTSE",
  DAX: "^GDAXI",
  NIKKEI: "^N225",
};

export interface ResolvedSymbol {
  /** Provider (Yahoo) symbol. */
  symbol: string;
  /** Normalized user input. */
  input: string;
  /** Clean display label. */
  display: string;
  assetClass: AssetClass;
  /** Reference timezone for period anchoring: UTC for 24/7 markets. */
  refTz: string;
}

function isForexPair(s: string): boolean {
  if (s.length !== 6) return false;
  return FOREX.has(s.slice(0, 3)) && FOREX.has(s.slice(3, 6));
}

export function resolveSymbol(raw: string): ResolvedSymbol {
  const input = raw.trim().toUpperCase().replace(/\s+/g, "");

  // Explicit Yahoo forms passed straight through.
  if (input.includes("=X")) {
    const pair = input.replace("=X", "");
    return {
      symbol: input,
      input,
      display: pair.length === 6 ? `${pair.slice(0, 3)}/${pair.slice(3)}` : pair,
      assetClass: "forex",
      refTz: "UTC",
    };
  }
  if (input.startsWith("^")) {
    return { symbol: input, input, display: input, assetClass: "index", refTz: "America/New_York" };
  }
  if (input.endsWith("-USD")) {
    return {
      symbol: input,
      input,
      display: input.replace("-USD", ""),
      assetClass: "crypto",
      refTz: "UTC",
    };
  }

  // Index aliases.
  if (INDICES[input]) {
    return { symbol: INDICES[input], input, display: input, assetClass: "index", refTz: "America/New_York" };
  }

  // Crypto tickers → -USD pair on Yahoo.
  if (CRYPTO.has(input)) {
    return {
      symbol: `${input}-USD`,
      input,
      display: input,
      assetClass: "crypto",
      refTz: "UTC",
    };
  }

  // Forex like EURUSD or EUR/USD → EURUSD=X.
  const fx = input.replace("/", "");
  if (isForexPair(fx)) {
    return {
      symbol: `${fx}=X`,
      input,
      display: `${fx.slice(0, 3)}/${fx.slice(3)}`,
      assetClass: "forex",
      refTz: "UTC",
    };
  }

  // Default: treat as an equity ticker. Exchange tz refined from quote meta.
  return { symbol: input, input, display: input, assetClass: "equity", refTz: "America/New_York" };
}
