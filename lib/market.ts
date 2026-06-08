/**
 * Cached market-data service. Centralizes symbol resolution + TTL caching so
 * multiple API routes reuse the same upstream Yahoo calls (CLAUDE.md §2.1).
 */

import { cached } from "@/lib/cache";
import { resolveSymbol, type ResolvedSymbol } from "@/lib/markets/symbol";
import { getQuote, getCandles } from "@/lib/providers/yahoo";
import { getProfile } from "@/lib/providers/profile";
import type { AssetProfile, Candle, Quote } from "@/lib/types";

export function resolve(input: string): ResolvedSymbol {
  return resolveSymbol(input);
}

export async function quote(input: string): Promise<{ value: Quote; stale: boolean }> {
  const r = resolve(input);
  const { value, stale } = await cached(`quote:${r.symbol}`, 6, () => getQuote(r));
  return { value, stale };
}

export async function profile(
  input: string,
): Promise<{ value: AssetProfile; stale: boolean }> {
  const r = resolve(input);
  // Profiles barely change → cache a day. The display name comes from the
  // (cheap, already-cached) quote so Wikipedia fallbacks resolve the right page.
  const { value, stale } = await cached(`profile:${r.symbol}`, 86_400, async () => {
    const name = await getQuote(r)
      .then((q) => q.name)
      .catch(() => r.display);
    return getProfile(r, name);
  });
  return { value, stale };
}

export async function dailyCandles(
  input: string,
): Promise<{ value: Candle[]; stale: boolean; resolved: ResolvedSymbol }> {
  const r = resolve(input);
  const { value, stale } = await cached(`candles:${r.symbol}:2y:1d`, 300, async () => {
    const { candles } = await getCandles(r, "2y", "1d");
    return candles;
  });
  return { value, stale, resolved: r };
}

export async function intradayCandles(
  input: string,
  range = "1d",
  interval = "5m",
): Promise<{ value: Candle[]; stale: boolean; resolved: ResolvedSymbol }> {
  const r = resolve(input);
  const { value, stale } = await cached(
    `candles:${r.symbol}:${range}:${interval}`,
    60,
    async () => {
      const { candles } = await getCandles(r, range, interval);
      return candles;
    },
  );
  return { value, stale, resolved: r };
}
