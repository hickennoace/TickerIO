/**
 * Yahoo Finance `quoteSummary` access — shared cookie+crumb handshake.
 *
 * Yahoo's `v10/finance/quoteSummary` endpoint requires a session cookie and a
 * matching crumb. We do the handshake once per warm instance (cached an hour)
 * and reuse it for every module fetch (asset profile, fundamentals, …). Returns
 * null on any failure so callers can fall back gracefully (e.g. to Wikipedia, or
 * to a "fundamentals unavailable" state) instead of throwing.
 */

import { fetchJson } from "@/lib/cache";

const YAHOO_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// quoteSummary requires a cookie + crumb. Cache the handshake per warm instance
// so we do it at most once an hour, then fall back if Yahoo blocks the IP.
let crumbCache: { cookie: string; crumb: string; at: number } | null = null;

export async function yahooCrumb(): Promise<{ cookie: string; crumb: string } | null> {
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

/**
 * Fetch one or more `quoteSummary` modules for a symbol. Returns the raw
 * `result[0]` object (still unvalidated — callers parse the modules they asked
 * for through Zod), or null on auth failure / empty / block.
 */
export async function yahooQuoteSummary(
  symbol: string,
  modules: string[],
): Promise<Record<string, unknown> | null> {
  const auth = await yahooCrumb();
  if (!auth) return null;
  const path = `/v10/finance/quoteSummary/${encodeURIComponent(
    symbol,
  )}?modules=${encodeURIComponent(modules.join(","))}&crumb=${encodeURIComponent(auth.crumb)}`;

  for (const host of YAHOO_HOSTS) {
    try {
      const raw = await fetchJson<{
        quoteSummary?: { result?: Record<string, unknown>[] | null };
      }>(`${host}${path}`, { headers: { Cookie: auth.cookie } });
      const result = raw.quoteSummary?.result?.[0];
      if (result) return result;
      return null; // reachable but empty → don't retry the other host
    } catch {
      // 401/Invalid Cookie or transient error → try next host, then caller falls back.
    }
  }
  return null;
}
