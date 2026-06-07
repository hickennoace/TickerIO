/**
 * Yahoo Finance per-symbol news via the public RSS headline feed.
 * Lightweight regex parse — no XML dependency needed server-side.
 */

import { fetchWith } from "@/lib/cache";
import type { NewsItem } from "@/lib/types";

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

export async function getNews(symbol: string): Promise<NewsItem[]> {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(
    symbol,
  )}&region=US&lang=en-US`;
  const res = await fetchWith(url, { headers: { Accept: "application/rss+xml,text/xml,*/*" } });
  const xml = await res.text();

  const items: NewsItem[] = [];
  const blocks = xml.split(/<item>/i).slice(1);
  for (let i = 0; i < blocks.length && items.length < 10; i++) {
    const block = blocks[i];
    const headline = tag(block, "title");
    const link = tag(block, "link");
    const pub = tag(block, "pubDate");
    if (!headline) continue;
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    items.push({
      id: `${symbol}-${i}`,
      headline,
      url: link,
      source: sourceMatch ? decode(sourceMatch[1]) : "Yahoo Finance",
      publishedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
    });
  }
  return items;
}
