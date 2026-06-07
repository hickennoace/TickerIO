"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchAiSummary,
  fetchCalendar,
  fetchCandles,
  fetchNews,
  fetchQuote,
  fetchSentiment,
  fetchTimeframes,
  fetchTrendBias,
} from "@/lib/api";

export function useQuote(symbol: string) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => fetchQuote(symbol),
    refetchInterval: 20_000,
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

export function useCalendar() {
  return useQuery({ queryKey: ["calendar"], queryFn: fetchCalendar, refetchInterval: 3_600_000 });
}
