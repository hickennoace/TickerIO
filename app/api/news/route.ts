import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { resolve } from "@/lib/market";
import { getNews, getCoinDeskNews, getFXStreetNews } from "@/lib/providers/news";
import { getEconomicCalendar } from "@/lib/providers/calendar";
import { buildNewsDigest } from "@/lib/news-digest";
import type { NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Stable short hash for caching the digest by its input headlines. */
function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

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

    const tasks: Promise<NewsItem[]>[] = [
      cached(`news:${r.symbol}`, 600, () => getNews(r.symbol)).then((x) => x.value).catch(() => []),
    ];
    if (r.assetClass === "crypto") {
      tasks.push(cached("news:coindesk", 600, getCoinDeskNews).then((x) => x.value).catch(() => []));
    }
    if (r.assetClass === "forex") {
      tasks.push(cached("news:fxstreet", 600, getFXStreetNews).then((x) => x.value).catch(() => []));
    }

    const [events, ...newsGroups] = await Promise.all([forexFactoryEvents(), ...tasks]);

    const articles = dedupe(newsGroups.flat()).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    // Forward-looking macro events first, then the freshest articles.
    const items = [...events, ...articles].slice(0, 12);

    // Plain-language digest of the actual article headlines (cached by hash so
    // identical news never re-triggers the LLM).
    const headlines = articles.slice(0, 6).map((a) => a.headline);
    const { value: digest } = await cached(
      `digest:${r.symbol}:${hash(headlines.join("|"))}`,
      1800,
      () => buildNewsDigest(r.display, headlines),
    ).catch(() => ({ value: null }));

    const sources = Array.from(new Set(items.map((i) => i.source)));
    return NextResponse.json({ items, sources, digest, asOf: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg, items: [] }, { status: 200 });
  }
}
