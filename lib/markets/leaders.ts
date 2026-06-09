/**
 * Market discovery universes — the curated symbol sets that power the
 * `/markets` Leaders board (CLAUDE.md Phase 10).
 *
 * Why curated lists instead of a Yahoo screener? The screener/quote-batch
 * endpoints now require a crumb+cookie and rate-limit hard. Our per-symbol
 * `chart` path (lib/providers/yahoo.ts) needs no key and is already cached, so
 * we fan out over a known, hand-picked universe of large, liquid names. Lists
 * are intentionally small per group to stay within sane request budgets.
 */

export interface SectorDef {
  key: string;
  label: string;
  /** SPDR sector ETF — the one-symbol headline for the sector's performance. */
  etf: string;
  /** Bellwether constituents we rank to find the sector's leaders. */
  constituents: string[];
}

/** The 11 GICS sectors, each headlined by its SPDR Select Sector ETF. */
export const SECTORS: SectorDef[] = [
  {
    key: "technology",
    label: "Technology",
    etf: "XLK",
    constituents: ["AAPL", "MSFT", "NVDA", "AVGO", "ORCL", "CRM", "CSCO", "ADBE", "AMD", "QCOM", "TXN", "INTC"],
  },
  {
    key: "communication",
    label: "Communication Services",
    etf: "XLC",
    constituents: ["GOOGL", "META", "NFLX", "DIS", "TMUS", "T", "VZ", "CMCSA", "CHTR", "EA"],
  },
  {
    key: "consumer-discretionary",
    label: "Consumer Discretionary",
    etf: "XLY",
    constituents: ["AMZN", "TSLA", "HD", "MCD", "BKNG", "LOW", "NKE", "SBUX", "TJX", "ORLY"],
  },
  {
    key: "consumer-staples",
    label: "Consumer Staples",
    etf: "XLP",
    constituents: ["WMT", "COST", "PG", "KO", "PEP", "PM", "MO", "MDLZ", "CL", "TGT"],
  },
  {
    key: "financials",
    label: "Financials",
    etf: "XLF",
    constituents: ["BRK-B", "JPM", "V", "MA", "BAC", "WFC", "GS", "MS", "AXP", "SCHW"],
  },
  {
    key: "health-care",
    label: "Health Care",
    etf: "XLV",
    constituents: ["LLY", "UNH", "JNJ", "ABBV", "MRK", "TMO", "ABT", "PFE", "DHR", "AMGN"],
  },
  {
    key: "industrials",
    label: "Industrials",
    etf: "XLI",
    constituents: ["GE", "CAT", "RTX", "HON", "UNP", "BA", "UPS", "DE", "LMT", "ADP"],
  },
  {
    key: "energy",
    label: "Energy",
    etf: "XLE",
    constituents: ["XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "WMB", "OXY", "VLO"],
  },
  {
    key: "materials",
    label: "Materials",
    etf: "XLB",
    constituents: ["LIN", "SHW", "FCX", "NEM", "APD", "ECL", "DOW", "NUE", "CTVA", "DD"],
  },
  {
    key: "utilities",
    label: "Utilities",
    etf: "XLU",
    constituents: ["NEE", "SO", "DUK", "CEG", "AEP", "SRE", "D", "EXC", "XEL", "PEG"],
  },
  {
    key: "real-estate",
    label: "Real Estate",
    etf: "XLRE",
    constituents: ["PLD", "AMT", "EQIX", "WELL", "SPG", "PSA", "O", "DLR", "CCI", "CBRE"],
  },
];

/**
 * The most famous cryptocurrencies — the household-name coins, not the long
 * tail. Yahoo `-USD` pairs, explicit so we bypass any gaps in the symbol
 * resolver. Ordered by recognition / market cap. Stablecoins are excluded (a
 * leaderboard of things pinned to $1 is pointless).
 */
export const CRYPTO_LEADERS: string[] = [
  "BTC-USD", "ETH-USD", "BNB-USD", "SOL-USD", "XRP-USD", "DOGE-USD",
  "ADA-USD", "TRX-USD", "AVAX-USD", "LINK-USD", "DOT-USD", "MATIC-USD",
  "LTC-USD", "BCH-USD", "SHIB-USD", "XLM-USD", "ATOM-USD", "NEAR-USD",
  "UNI7083-USD", "PEPE24478-USD",
];

/**
 * Yahoo disambiguates some coins with numeric suffixes (UNI → UNI7083, PEPE →
 * PEPE24478) because the bare ticker collides with an equity. Present them
 * cleanly anyway.
 */
export const CRYPTO_OVERRIDES: Record<string, { display: string; name: string }> = {
  "UNI7083-USD": { display: "UNI", name: "Uniswap" },
  "PEPE24478-USD": { display: "PEPE", name: "Pepe" },
};

export interface CommodityDef {
  /** Yahoo futures symbol (continuous front month), e.g. "GC=F". */
  symbol: string;
  name: string;
}

export interface CommodityGroup {
  group: string;
  items: CommodityDef[];
}

/**
 * Commodities ("materials" in the everyday sense) — precious/base metals,
 * energy, and agriculture via Yahoo continuous futures (`=F`).
 */
export const COMMODITIES: CommodityGroup[] = [
  {
    group: "Metals",
    items: [
      { symbol: "GC=F", name: "Gold" },
      { symbol: "SI=F", name: "Silver" },
      { symbol: "PL=F", name: "Platinum" },
      { symbol: "PA=F", name: "Palladium" },
      { symbol: "HG=F", name: "Copper" },
    ],
  },
  {
    group: "Energy",
    items: [
      { symbol: "CL=F", name: "Crude Oil (WTI)" },
      { symbol: "BZ=F", name: "Brent Crude" },
      { symbol: "NG=F", name: "Natural Gas" },
      { symbol: "RB=F", name: "Gasoline" },
      { symbol: "HO=F", name: "Heating Oil" },
    ],
  },
  {
    group: "Agriculture",
    items: [
      { symbol: "ZC=F", name: "Corn" },
      { symbol: "ZW=F", name: "Wheat" },
      { symbol: "ZS=F", name: "Soybeans" },
      { symbol: "KC=F", name: "Coffee" },
      { symbol: "SB=F", name: "Sugar" },
      { symbol: "CT=F", name: "Cotton" },
      { symbol: "CC=F", name: "Cocoa" },
    ],
  },
];

/** Friendly display-name overrides for symbols whose Yahoo name is noisy. */
export const COMMODITY_NAMES: Record<string, string> = Object.fromEntries(
  COMMODITIES.flatMap((g) => g.items.map((i) => [i.symbol, i.name])),
);

/**
 * The cross-asset "movers" universe — the single, hand-picked watchlist that
 * powers the *Movers of the day* leaderboard and the *52-week range* scans
 * (CLAUDE.md Phase 10). One curated set (≤ the batch endpoint's 60-symbol cap)
 * so both boards resolve in a single cached `/api/batch-quotes` fan-out.
 *
 * Composition: the mega-cap names across every equity sector that actually
 * carry the tape, plus the household-name coins. We deliberately keep liquid,
 * well-known symbols only — a "biggest mover" surfacing some illiquid micro-cap
 * would be noise, not signal. 52-week highs/lows come back on the same quote.
 */
export const MOVERS_UNIVERSE: string[] = [
  // Mega-cap tech / communication / discretionary
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "ORCL",
  "NFLX", "AMD", "CRM", "ADBE", "INTC", "QCOM", "MU", "PLTR", "UBER",
  "SHOP", "COIN",
  // Financials
  "JPM", "V", "MA", "BAC", "GS",
  // Health care
  "LLY", "UNH", "JNJ", "MRK", "PFE",
  // Energy / industrials / materials
  "XOM", "CVX", "CAT", "GE", "BA", "FCX",
  // Consumer staples / discretionary anchors
  "WMT", "COST", "HD", "MCD", "KO", "PEP", "NKE", "DIS",
  // Household-name crypto
  "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "DOGE-USD",
  "ADA-USD", "AVAX-USD", "LINK-USD",
];
