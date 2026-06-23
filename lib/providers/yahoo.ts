/**
 * Yahoo Finance provider — primary source for equities, crypto, forex, indices.
 *
 * Uses the public `v8/finance/chart` endpoint (no key, no crumb required).
 * Everything is validated through Zod before it reaches domain logic.
 */

import { fetchJson } from "@/lib/cache";
import { yahooChart, type YahooQuoteMeta } from "@/lib/schemas/yahoo";
import type { Candle, Quote } from "@/lib/types";
import { resolveSymbol, type ResolvedSymbol } from "@/lib/markets/symbol";
import { pctChange, absChange } from "@/lib/finance/change";

const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

interface ChartFetch {
  meta: YahooQuoteMeta;
  candles: Candle[];
}

async function fetchChart(
  symbol: string,
  range: string,
  interval: string,
): Promise<ChartFetch> {
  const path = `/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=false`;

  let lastErr: unknown;
  for (const host of HOSTS) {
    try {
      const raw = await fetchJson<unknown>(`${host}${path}`);
      const parsed = yahooChart.parse(raw);
      if (parsed.chart.error) {
        throw new Error(parsed.chart.error.description ?? "Yahoo chart error");
      }
      const result = parsed.chart.result?.[0];
      if (!result) throw new Error(`No data for ${symbol}`);

      const ts = result.timestamp ?? [];
      const q = result.indicators.quote?.[0];
      const candles: Candle[] = [];
      for (let i = 0; i < ts.length; i++) {
        const o = q?.open?.[i];
        const h = q?.high?.[i];
        const l = q?.low?.[i];
        const c = q?.close?.[i];
        if (o == null || h == null || l == null || c == null) continue;
        candles.push({ t: ts[i] * 1000, o, h, l, c, v: q?.volume?.[i] ?? 0 });
      }
      return { meta: result.meta, candles };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Yahoo unreachable");
}

const NAMES: Record<string, string> = {
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "SOL-USD": "Solana",
};

export async function getQuote(resolved: ResolvedSymbol): Promise<Quote> {
  // 1d/1m gives the freshest price + today's session for the headline.
  const { meta } = await fetchChart(resolved.symbol, "1d", "1m");
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const name =
    meta.longName ?? meta.shortName ?? NAMES[resolved.symbol] ?? resolved.display;

  return {
    symbol: resolved.symbol,
    display: resolved.display,
    name,
    assetClass: resolved.assetClass,
    currency: meta.currency ?? "USD",
    price,
    previousClose: prev,
    change: absChange(price, prev),
    changePct: pctChange(price, prev),
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? "",
    exchangeTz: meta.exchangeTimezoneName ?? resolved.refTz,
    asOf: new Date((meta.regularMarketTime ?? Date.now() / 1000) * 1000).toISOString(),
    source: "Yahoo Finance",
  };
}

export async function getCandles(
  resolved: ResolvedSymbol,
  range: string,
  interval: string,
): Promise<{ candles: Candle[]; meta: YahooQuoteMeta }> {
  const { candles, meta } = await fetchChart(resolved.symbol, range, interval);
  return { candles, meta };
}

export { resolveSymbol };
