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
import { yahooQuoteSummary } from "@/lib/providers/yahoo-auth";
import type { AssetProfile } from "@/lib/types";
import type { ResolvedSymbol } from "@/lib/markets/symbol";

const assetProfileSchema = z.object({
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
  const result = await yahooQuoteSummary(symbol, ["assetProfile"]);
  if (!result) return null;
  // Degrade to Wikipedia (return null) on any odd field shape rather than
  // letting a Zod throw bubble up to a 502 for the whole profile card.
  const parsed = assetProfileSchema.safeParse(result);
  if (!parsed.success) return null;
  const p = parsed.data.assetProfile;
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
