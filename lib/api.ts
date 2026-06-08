/** Typed client-side fetchers for the internal API routes. */

import type {
  Candle,
  CalendarEvent,
  NewsItem,
  Quote,
  TimeframeRow,
  TrendBiasResult,
} from "@/lib/types";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed: ${res.status}`);
  return json as T;
}

export type QuoteResponse = Quote & { stale?: boolean };

export const fetchQuote = (symbol: string) =>
  get<QuoteResponse>(`/api/quote?symbol=${encodeURIComponent(symbol)}`);

export const fetchCandles = (symbol: string, range = "1d", interval = "5m") =>
  get<{ candles: Candle[]; interval: string; source: string; asOf: string }>(
    `/api/candles?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`,
  );

export const fetchTimeframes = (symbol: string) =>
  get<{ rows: TimeframeRow[]; currency: string; tz: string; source: string; asOf: string }>(
    `/api/timeframes?symbol=${encodeURIComponent(symbol)}`,
  );

export interface SentimentResponse {
  score: number;
  label: string;
  breakdown: { momentum: number; strength: number; volatility: number };
  source: string;
  asOf: string;
}
export const fetchSentiment = (symbol: string) =>
  get<SentimentResponse>(`/api/sentiment?symbol=${encodeURIComponent(symbol)}`);

export const fetchTrendBias = (symbol: string) =>
  get<TrendBiasResult & { source: string; asOf: string }>(
    `/api/trend-bias?symbol=${encodeURIComponent(symbol)}`,
  );

export interface NewsDigest {
  text: string;
  lean: "positive" | "negative" | "mixed";
  generatedBy: string;
}
export const fetchNews = (symbol: string) =>
  get<{ items: NewsItem[]; sources: string[]; digest: NewsDigest | null; asOf: string }>(
    `/api/news?symbol=${encodeURIComponent(symbol)}`,
  );

export interface AiSummaryResponse {
  summary: string;
  sentiment: "Bearish" | "Neutral" | "Bullish";
  generatedBy: string;
  disclaimer: string;
  asOf: string;
}
export const fetchAiSummary = (symbol: string) =>
  get<AiSummaryResponse>(`/api/ai-summary?symbol=${encodeURIComponent(symbol)}`);

export const fetchCalendar = () =>
  get<{ events: CalendarEvent[]; source: string; asOf: string }>(`/api/calendar`);

export interface SearchHit {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}
export const fetchSearch = (q: string) =>
  get<{ hits: SearchHit[] }>(`/api/search?q=${encodeURIComponent(q)}`);
