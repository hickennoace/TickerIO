/** Shared domain types. Keep pure — no React, no fetch. */

export type AssetClass = "equity" | "crypto" | "forex" | "index";

export interface Quote {
  /** Resolved provider symbol, e.g. "BTC-USD", "AAPL", "EURUSD=X". */
  symbol: string;
  /** User-facing display, e.g. "BTC", "AAPL", "EUR/USD". */
  display: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  price: number;
  previousClose: number;
  /** Change vs previous close (the standard quote convention). */
  change: number;
  changePct: number;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  exchange: string;
  exchangeTz: string;
  /** ISO timestamp of the underlying market data. */
  asOf: string;
  source: string;
}

export interface Candle {
  /** Epoch milliseconds. */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface CandleSeries {
  symbol: string;
  interval: string;
  range: string;
  candles: Candle[];
  asOf: string;
  source: string;
}

export interface TimeframeRow {
  label: string;
  /** % change vs the anchored period open (CLAUDE.md §4). */
  changePct: number;
  changeAbs: number;
  /** Human anchor description, e.g. "Mon 00:00 UTC". */
  anchor: string;
  /** ISO timestamp of the anchor candle. */
  anchorAt: string;
}

export interface NewsItem {
  id: string;
  source: string;
  headline: string;
  url: string;
  publishedAt: string;
}

export interface SentimentResult {
  /** 0..100 Fear & Greed composite. */
  score: number;
  label: string;
  source: string;
  asOf: string;
}

export interface TrendBiasResult {
  /** -100..100. */
  bias: number;
  /** -100..100 technical momentum. */
  technical: number;
  /** -100..100 news/market sentiment. */
  sentiment: number;
  label: string;
}

export interface CalendarEvent {
  title: string;
  country: string;
  impact: "High" | "Medium" | "Low" | "Holiday";
  date: string;
  forecast: string;
  previous: string;
}

export interface ApiError {
  error: string;
}
