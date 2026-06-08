/**
 * News providers.
 * - Yahoo Finance per-symbol RSS (all asset classes).
 * - CoinDesk general crypto RSS (added for crypto symbols).
 * Lightweight regex parse — no XML dependency needed server-side.
 */

import { fetchWith } from "@/lib/cache";
import type { NewsItem } from "@/lib/types";

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

/** Parse a standard RSS 2.0 feed into NewsItems. */
function parseRss(xml: string, source: string, idPrefix: string, limit: number): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.split(/<item>/i).slice(1);
  for (let i = 0; i < blocks.length && items.length < limit; i++) {
    const block = blocks[i];
    const headline = tag(block, "title");
    const link = tag(block, "link");
    const pub = tag(block, "pubDate");
    if (!headline) continue;
    const srcTag = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    items.push({
      id: `${idPrefix}-${i}`,
      headline,
      url: link,
      source: srcTag ? decode(srcTag[1]) : source,
      publishedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      kind: "news",
    });
  }
  return items;
}

export async function getNews(symbol: string): Promise<NewsItem[]> {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(
    symbol,
  )}&region=US&lang=en-US`;
  const res = await fetchWith(url, { headers: { Accept: "application/rss+xml,text/xml,*/*" } });
  const xml = await res.text();
  return parseRss(xml, "Yahoo Finance", symbol, 10);
}

/** CoinDesk general crypto headlines — a leading dedicated crypto news source. */
export async function getCoinDeskNews(): Promise<NewsItem[]> {
  const res = await fetchWith("https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml", {
    headers: { Accept: "application/rss+xml,text/xml,*/*" },
  });
  const xml = await res.text();
  return parseRss(xml, "CoinDesk", "coindesk", 10);
}

/** FXStreet headlines — a leading dedicated forex/macro news source. */
export async function getFXStreetNews(): Promise<NewsItem[]> {
  const res = await fetchWith("https://www.fxstreet.com/rss/news", {
    headers: { Accept: "application/rss+xml,text/xml,*/*" },
  });
  const xml = await res.text();
  return parseRss(xml, "FXStreet", "fxstreet", 10);
}
