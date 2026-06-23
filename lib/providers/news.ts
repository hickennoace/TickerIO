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
    // Numeric/hex entities (e.g. &#x2019; curly quote, &#8217;) — common in
    // MarketWatch/CNBC titles.
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // Strip tags last, so any revealed by &lt;/&gt; decoding are removed too.
    .replace(/<[^>]+>/g, "")
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

/** Stable content hash so item ids are unique across symbols/sources — positional
 *  ids like "cnbc-2" collide and make React Query serve the wrong article summary. */
function hashId(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
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
    const description = tag(block, "description");
    items.push({
      id: `${idPrefix}-${hashId(link || headline)}`,
      headline,
      url: link,
      description: description || undefined,
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

/**
 * Direct/proxied publisher feeds.
 */
const RSS_ACCEPT = { Accept: "application/rss+xml,text/xml,*/*" } as const;

/** Fetch a publisher's own RSS feed directly. Returns [] on block/empty. */
async function directRss(
  url: string,
  source: string,
  idPrefix: string,
  limit: number,
): Promise<NewsItem[]> {
  try {
    const res = await fetchWith(url, { headers: RSS_ACCEPT });
    return parseRss(await res.text(), source, idPrefix, limit);
  } catch {
    return [];
  }
}

/**
 * Pull a publisher's headlines via Google News RSS (`site:<domain>`). Used for
 * outlets whose own feeds block cloud datacenters (Vercel) — Google News is
 * datacenter-friendly and links resolve back to the original articles.
 */
async function googleNewsSite(
  domain: string,
  label: string,
  idPrefix: string,
  limit = 8,
): Promise<NewsItem[]> {
  const url =
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(`site:${domain} when:5d`) +
    "&hl=en-US&gl=US&ceid=US:en";
  const res = await fetchWith(url, { headers: RSS_ACCEPT });
  const xml = await res.text();
  // Google News appends " - <Publisher>" to titles; strip it for our label.
  const suffix = new RegExp(`\\s*[-|]\\s*${label}\\s*$`, "i");
  return parseRss(xml, label, idPrefix, limit).map((it) => ({
    ...it,
    source: label,
    headline: it.headline.replace(suffix, ""),
  }));
}

/** FXStreet (forex/macro) — own feed blocks datacenters, so via Google News. */
export async function getFXStreetNews(): Promise<NewsItem[]> {
  return googleNewsSite("fxstreet.com", "FXStreet", "fxstreet", 10);
}

/** CNBC Markets — a leading general capital-markets newsroom. Direct RSS. */
export async function getCNBCNews(): Promise<NewsItem[]> {
  return directRss(
    "https://www.cnbc.com/id/20910258/device/rss/rss.html",
    "CNBC",
    "cnbc",
    6,
  );
}

/**
 * MarketWatch top stories. Its Akamai-fronted feed serves residential IPs but
 * may 403 from datacenters, so we try the direct feed first and fall back to
 * the Google News proxy if it comes back empty/blocked.
 */
export async function getMarketWatchNews(): Promise<NewsItem[]> {
  const direct = await directRss(
    "https://feeds.marketwatch.com/marketwatch/topstories/",
    "MarketWatch",
    "mw",
    6,
  );
  if (direct.length) return direct;
  return googleNewsSite("marketwatch.com", "MarketWatch", "mw", 6);
}

/** Cointelegraph (crypto) — direct RSS. */
export async function getCointelegraphNews(): Promise<NewsItem[]> {
  return directRss("https://cointelegraph.com/rss", "Cointelegraph", "cointelegraph", 6);
}

/** Decrypt (crypto) — direct RSS. */
export async function getDecryptNews(): Promise<NewsItem[]> {
  return directRss("https://decrypt.co/feed", "Decrypt", "decrypt", 6);
}
