/** Yahoo Finance symbol search — powers autocomplete + the command palette. */

import { z } from "zod";
import { fetchJson } from "@/lib/cache";

const schema = z.object({
  quotes: z
    .array(
      z
        .object({
          symbol: z.string().optional(),
          shortname: z.string().optional(),
          longname: z.string().optional(),
          quoteType: z.string().optional(),
          exchDisp: z.string().optional(),
          typeDisp: z.string().optional(),
        })
        .passthrough(),
    )
    .optional()
    .default([]),
});

export interface SearchHit {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export async function searchSymbols(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    q,
  )}&quotesCount=8&newsCount=0&enableFuzzyQuery=false`;
  const raw = await fetchJson<unknown>(url);
  const parsed = schema.parse(raw);
  return parsed.quotes
    .filter((x) => x.symbol && (x.quoteType === "EQUITY" || x.quoteType === "CRYPTOCURRENCY" || x.quoteType === "CURRENCY" || x.quoteType === "INDEX" || x.quoteType === "ETF"))
    .map((x) => ({
      symbol: x.symbol!,
      name: x.shortname ?? x.longname ?? x.symbol!,
      type: x.typeDisp ?? x.quoteType ?? "",
      exchange: x.exchDisp ?? "",
    }))
    .slice(0, 7);
}
