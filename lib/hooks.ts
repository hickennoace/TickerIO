"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { QuoteResponse } from "@/lib/api";
import {
  fetchAiSummary,
  fetchArticleSummary,
  fetchBatchQuotes,
  fetchCalendar,
  fetchCandles,
  fetchNews,
  fetchProfile,
  fetchQuote,
  fetchSearch,
  fetchSentiment,
  fetchTimeframes,
  fetchTrendBias,
} from "@/lib/api";
import type { NewsItem } from "@/lib/types";

/** Debounce any fast-changing value. */
export function useDebounced<T>(value: T, ms = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export function useSearch(query: string) {
  const q = useDebounced(query.trim(), 220);
  return useQuery({
    queryKey: ["search", q],
    queryFn: () => fetchSearch(q),
    enabled: q.length >= 1,
    staleTime: 60_000,
  });
}

export function useQuote(symbol: string) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => fetchQuote(symbol),
    // Polling is a fallback; usePriceStream pushes live ticks when connected.
    refetchInterval: 30_000,
  });
}

interface PriceTick {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  asOf: string;
  stale?: boolean;
}

/**
 * Live price stream via SSE. Patches the React Query ["quote", symbol] cache on
 * every tick, so PriceHeader (and anything else reading the quote) updates in
 * real time. Auto-reconnects (EventSource) and is a no-op without browser support.
 */
export function usePriceStream(symbol: string, enabled = true) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || !symbol || typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }
    const es = new EventSource(`/api/stream?symbol=${encodeURIComponent(symbol)}`);
    es.addEventListener("price", (e) => {
      try {
        const tick = JSON.parse((e as MessageEvent).data) as PriceTick;
        qc.setQueryData<QuoteResponse>(["quote", symbol], (prev) =>
          prev
            ? {
                ...prev,
                price: tick.price,
                change: tick.change,
                changePct: tick.changePct,
                asOf: tick.asOf,
                stale: tick.stale ?? false,
              }
            : prev,
        );
      } catch {
        /* ignore malformed tick */
      }
    });
    // EventSource auto-reconnects on error; nothing to do here.
    return () => es.close();
  }, [symbol, enabled, qc]);
}

/**
 * Batch quotes for a group of symbols (Leaders board). `key` namespaces the
 * cache so the Sectors/Crypto/Commodities tabs don't collide. Refetches on a
 * relaxed cadence — discovery boards don't need tick-level freshness.
 */
export function useBatchQuotes(key: string, symbols: string[], enabled = true) {
  return useQuery({
    queryKey: ["batch-quotes", key],
    queryFn: () => fetchBatchQuotes(symbols),
    enabled: enabled && symbols.length > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useCandles(symbol: string, range = "1d", interval = "5m") {
  return useQuery({
    queryKey: ["candles", symbol, range, interval],
    queryFn: () => fetchCandles(symbol, range, interval),
    refetchInterval: 60_000,
  });
}

export function useTimeframes(symbol: string) {
  return useQuery({
    queryKey: ["timeframes", symbol],
    queryFn: () => fetchTimeframes(symbol),
    refetchInterval: 60_000,
  });
}

export function useSentiment(symbol: string) {
  return useQuery({ queryKey: ["sentiment", symbol], queryFn: () => fetchSentiment(symbol) });
}

export function useTrendBias(symbol: string) {
  return useQuery({ queryKey: ["trend-bias", symbol], queryFn: () => fetchTrendBias(symbol) });
}

export function useNews(symbol: string) {
  return useQuery({
    queryKey: ["news", symbol],
    queryFn: () => fetchNews(symbol),
    refetchInterval: 300_000,
  });
}

export function useAiSummary(symbol: string) {
  return useQuery({ queryKey: ["ai-summary", symbol], queryFn: () => fetchAiSummary(symbol) });
}

export function useProfile(symbol: string) {
  return useQuery({
    queryKey: ["profile", symbol],
    queryFn: () => fetchProfile(symbol),
    // Descriptions are near-static; keep them fresh for an hour, retry once.
    staleTime: 3_600_000,
    retry: 1,
  });
}

/** Lazily summarize one article's context — fires only once expanded. */
export function useArticleSummary(symbol: string, item: NewsItem, enabled: boolean) {
  return useQuery({
    queryKey: ["article-summary", item.id],
    queryFn: () => fetchArticleSummary(symbol, item),
    enabled,
    staleTime: 3_600_000,
    retry: 1,
  });
}

export function useCalendar() {
  return useQuery({ queryKey: ["calendar"], queryFn: fetchCalendar, refetchInterval: 3_600_000 });
}
