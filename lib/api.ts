/** Typed client-side fetchers for the internal API routes. */

import type {
  AssetProfile,
  Candle,
  CalendarEvent,
  MiniQuote,
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

export interface BatchQuotesResponse {
  quotes: MiniQuote[];
  stale?: boolean;
  asOf?: string;
}
/** Fetch many lightweight quotes at once — powers the Leaders board. */
export const fetchBatchQuotes = (symbols: string[]) =>
  get<BatchQuotesResponse>(`/api/batch-quotes?symbols=${encodeURIComponent(symbols.join(","))}`);

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

export const fetchNews = (symbol: string) =>
  get<{ items: NewsItem[]; sources: string[]; asOf: string }>(
    `/api/news?symbol=${encodeURIComponent(symbol)}`,
  );

export interface ArticleSummaryResponse {
  summary: string;
  generatedBy: string;
}
/** Lazy per-article context summary (POST — the article excerpt can be long). */
export async function fetchArticleSummary(
  symbol: string,
  item: { headline: string; url: string; description?: string },
): Promise<ArticleSummaryResponse> {
  const res = await fetch("/api/article-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol,
      headline: item.headline,
      url: item.url,
      description: item.description ?? "",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed: ${res.status}`);
  return json as ArticleSummaryResponse;
}

export interface AiSummaryResponse {
  summary: string;
  sentiment: "Bearish" | "Neutral" | "Bullish";
  generatedBy: string;
  disclaimer: string;
  asOf: string;
}
export const fetchAiSummary = (symbol: string) =>
  get<AiSummaryResponse>(`/api/ai-summary?symbol=${encodeURIComponent(symbol)}`);

export type AssetProfileResponse = AssetProfile & { stale?: boolean };
export const fetchProfile = (symbol: string) =>
  get<AssetProfileResponse>(`/api/profile?symbol=${encodeURIComponent(symbol)}`);

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
