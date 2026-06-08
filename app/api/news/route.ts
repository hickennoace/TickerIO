import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { resolve } from "@/lib/market";
import {
  getNews,
  getCoinDeskNews,
  getFXStreetNews,
  getCNBCNews,
  getMarketWatchNews,
  getCointelegraphNews,
  getDecryptNews,
} from "@/lib/providers/news";
import { getEconomicCalendar } from "@/lib/providers/calendar";
import type { NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Upcoming high-impact Forex Factory events as forward-looking news items. */
async function forexFactoryEvents(): Promise<NewsItem[]> {
  try {
    const { value } = await cached("calendar:thisweek", 3600, getEconomicCalendar);
    const now = Date.now();
    return value
      .filter((e) => e.impact === "High" && new Date(e.date).getTime() >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 2)
      .map((e, i) => ({
        id: `ff-${i}`,
        headline: `${e.country} · ${e.title}${e.forecast ? ` (forecast ${e.forecast})` : ""}`,
        url: "https://www.forexfactory.com/calendar",
        source: "Forex Factory",
        publishedAt: new Date(e.date).toISOString(),
        kind: "event" as const,
        impact: e.impact,
      }));
  } catch {
    return [];
  }
}

function dedupe(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = it.headline.toLowerCase().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const r = resolve(symbol);

    const src = (key: string, fn: () => Promise<NewsItem[]>) =>
      cached(key, 600, fn).then((x) => x.value).catch(() => []);

    // Per-symbol Yahoo for every asset, then asset-class-specific newsrooms.
    const tasks: Promise<NewsItem[]>[] = [src(`news:${r.symbol}`, () => getNews(r.symbol))];

    if (r.assetClass === "equity" || r.assetClass === "index") {
      tasks.push(src("news:cnbc", getCNBCNews), src("news:marketwatch", getMarketWatchNews));
    }
    if (r.assetClass === "crypto") {
      tasks.push(
        src("news:coindesk", getCoinDeskNews),
        src("news:cointelegraph", getCointelegraphNews),
        src("news:decrypt", getDecryptNews),
      );
    }
    if (r.assetClass === "forex") {
      tasks.push(src("news:fxstreet", getFXStreetNews));
    }

    const [events, ...newsGroups] = await Promise.all([forexFactoryEvents(), ...tasks]);

    // Sort each source newest-first, then round-robin interleave so the feed
    // shows a balance across newsrooms rather than letting one dominate by
    // recency — the whole point is multi-source capital-markets coverage.
    for (const g of newsGroups) {
      g.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }
    const interleaved: NewsItem[] = [];
    for (let round = 0, more = true; more; round++) {
      more = false;
      for (const g of newsGroups) {
        const item = g[round];
        if (item) {
          interleaved.push(item);
          more = true;
        }
      }
    }
    const articles = dedupe(interleaved);

    // Forward-looking macro events first, then the balanced article mix.
    const items = [...events, ...articles].slice(0, 14);

    const sources = Array.from(new Set(items.map((i) => i.source)));
    return NextResponse.json({ items, sources, asOf: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg, items: [] }, { status: 200 });
  }
}
