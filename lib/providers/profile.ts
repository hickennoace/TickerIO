/**
 * Asset profile provider — a plain-language "about" for a symbol: what it is,
 * what it does, and (for companies) its flagship products. Factual & sourced,
 * no LLM so it never hallucinates products:
 *
 *  - Equities → Yahoo Finance `quoteSummary` `assetProfile` (longBusinessSummary,
 *    which describes the business and its products, plus sector/industry/etc.).
 *  - Crypto / forex / indices (and any equity Yahoo can't cover) → the summary
 *    of the matching Wikipedia article.
 *
 * Validated through Zod at the boundary (CLAUDE.md §3).
 */

import { z } from "zod";
import { fetchJson } from "@/lib/cache";
import type { AssetProfile } from "@/lib/types";
import type { ResolvedSymbol } from "@/lib/markets/symbol";

const YAHOO_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// quoteSummary now requires a cookie + crumb. Cache the handshake per warm
// instance so we do it at most once an hour, then fall back to Wikipedia if
// Yahoo blocks the datacenter IP.
let crumbCache: { cookie: string; crumb: string; at: number } | null = null;

async function yahooCrumb(): Promise<{ cookie: string; crumb: string } | null> {
  if (crumbCache && Date.now() - crumbCache.at < 3_600_000) {
    return { cookie: crumbCache.cookie, crumb: crumbCache.crumb };
  }
  try {
    // 1) Seed a session cookie (fc.yahoo.com sets A1/A3 even on a 404).
    const seed = await fetch("https://fc.yahoo.com/", {
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });
    const headers = seed.headers as Headers & { getSetCookie?: () => string[] };
    const raw =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : [headers.get("set-cookie") ?? ""];
    const cookie = raw
      .map((c) => c.split(";")[0])
      .filter(Boolean)
      .join("; ");
    if (!cookie) return null;

    // 2) Exchange the cookie for a crumb.
    const res = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": UA, Cookie: cookie, Accept: "text/plain,*/*" },
    });
    const crumb = (await res.text()).trim();
    if (!crumb || crumb.length > 32 || crumb.includes("<")) return null;

    crumbCache = { cookie, crumb, at: Date.now() };
    return { cookie, crumb };
  } catch {
    return null;
  }
}

const assetProfileSchema = z.object({
  quoteSummary: z.object({
    result: z
      .array(
        z.object({
          assetProfile: z
            .object({
              longBusinessSummary: z.string().optional(),
              sector: z.string().optional(),
              industry: z.string().optional(),
              website: z.string().optional(),
              country: z.string().optional(),
              fullTimeEmployees: z.number().optional(),
            })
            .passthrough()
            .optional(),
        }),
      )
      .nullable()
      .optional(),
  }),
});

interface YahooProfile {
  summary: string;
  sector?: string;
  industry?: string;
  website?: string;
  country?: string;
  employees?: number;
}

/** Equity business profile from Yahoo. Returns null on 401/empty so we fall back. */
async function yahooProfile(symbol: string): Promise<YahooProfile | null> {
  const auth = await yahooCrumb();
  if (!auth) return null;
  const path = `/v10/finance/quoteSummary/${encodeURIComponent(
    symbol,
  )}?modules=assetProfile&crumb=${encodeURIComponent(auth.crumb)}`;
  for (const host of YAHOO_HOSTS) {
    try {
      const raw = await fetchJson<unknown>(`${host}${path}`, {
        headers: { Cookie: auth.cookie },
      });
      const p = assetProfileSchema.parse(raw).quoteSummary.result?.[0]?.assetProfile;
      if (p?.longBusinessSummary) {
        return {
          summary: p.longBusinessSummary,
          sector: p.sector,
          industry: p.industry,
          website: p.website,
          country: p.country,
          employees: p.fullTimeEmployees,
        };
      }
      return null; // reachable but no profile module → skip the other host
    } catch {
      // 401/Invalid Cookie or transient error → try next host, then Wikipedia.
    }
  }
  return null;
}

// Wikipedia full-text search (relevance-ranked → resolves "Solana cryptocurrency"
// to "Solana (blockchain platform)", which opensearch's prefix match misses).
const restSearchSchema = z.object({
  pages: z.array(z.object({ title: z.string() })),
});

const wikiSummarySchema = z
  .object({
    type: z.string().optional(),
    title: z.string().optional(),
    extract: z.string().optional(),
    content_urls: z
      .object({ desktop: z.object({ page: z.string() }).partial().optional() })
      .optional(),
  })
  .passthrough();

async function wikiSearch(query: string, limit = 4): Promise<string[]> {
  const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(
    query,
  )}&limit=${limit}`;
  return restSearchSchema.parse(await fetchJson<unknown>(url)).pages.map((p) => p.title);
}

async function wikiSummaryFor(
  title: string,
): Promise<{ summary: string; url?: string } | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const parsed = wikiSummarySchema.parse(await fetchJson<unknown>(url));
  if (parsed.type === "disambiguation" || !parsed.extract) return null;
  return { summary: parsed.extract, url: parsed.content_urls?.desktop?.page };
}

/** Resolve a query to the best real (non-disambiguation) article summary. */
async function wikiSummary(query: string): Promise<{ summary: string; url?: string } | null> {
  const titles = await wikiSearch(query).catch(() => []);
  for (const title of titles) {
    const s = await wikiSummaryFor(title).catch(() => null);
    if (s) return s;
  }
  return null;
}

const CURRENCY_NAMES: Record<string, string> = {
  USD: "United States dollar",
  EUR: "Euro",
  GBP: "Pound sterling",
  JPY: "Japanese yen",
  AUD: "Australian dollar",
  CAD: "Canadian dollar",
  CHF: "Swiss franc",
  NZD: "New Zealand dollar",
  CNY: "Renminbi",
  HKD: "Hong Kong dollar",
};

/** Build the best Wikipedia search query for this asset class. */
function wikiQuery(resolved: ResolvedSymbol, name: string): string {
  switch (resolved.assetClass) {
    case "crypto": {
      // Yahoo names crypto "Bitcoin USD" → strip the quote currency.
      const coin = name.replace(/\s+USD$/i, "").trim() || resolved.display;
      return `${coin} cryptocurrency`;
    }
    case "forex": {
      const base = resolved.symbol.slice(0, 3).toUpperCase();
      return CURRENCY_NAMES[base] ?? `${base} currency`;
    }
    default:
      return name || resolved.display; // equities & indices: the proper name
  }
}

export async function getProfile(
  resolved: ResolvedSymbol,
  name: string,
): Promise<AssetProfile> {
  const base = {
    symbol: resolved.symbol,
    display: resolved.display,
    name,
    assetClass: resolved.assetClass,
    asOf: new Date().toISOString(),
  };

  // Equities: prefer Yahoo's business profile (richest on operations & products).
  if (resolved.assetClass === "equity") {
    const y = await yahooProfile(resolved.symbol);
    if (y) {
      return {
        ...base,
        summary: y.summary,
        sector: y.sector,
        industry: y.industry,
        website: y.website,
        url: y.website,
        country: y.country,
        employees: y.employees,
        source: "Yahoo Finance",
      };
    }
  }

  // Everything else (and the equity fallback): the Wikipedia article summary.
  const w = await wikiSummary(wikiQuery(resolved, name));
  if (w) {
    return { ...base, summary: w.summary, url: w.url, source: "Wikipedia" };
  }

  throw new Error(`No profile available for ${resolved.display}`);
}
