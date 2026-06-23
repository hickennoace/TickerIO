/**
 * Best-effort article body extractor. Fetches a news URL and pulls the readable
 * paragraph text so the summarizer has the real story, not just the headline.
 *
 * Deliberately lightweight (no headless browser): drop scripts/styles, collect
 * <p> text. Returns "" on anything it can't fetch/parse so callers fall back to
 * the feed excerpt. Skips redirect-only sources (Google News, Forex Factory).
 */

import { fetchWith } from "@/lib/cache";

/** Phrases that mark page chrome (consent walls, nav, legal), not article prose. */
const JUNK_RE =
  /(we and our partners|cookie|consent|privacy policy|terms of (use|service)|sign in to|please enable|enable javascript|your browser|all rights reserved|do not sell|advertisement|subscribe to|create a free account|already a subscriber)/i;

/**
 * SSRF guard: only allow fetching real public http(s) URLs. Rejects non-http
 * schemes, localhost / *.local / *.internal, and private / loopback / link-local
 * / metadata IP literals (incl. any IPv6 literal). Returns a parsed URL or null.
 */
function safePublicUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
  if (host.includes(":")) return null; // bracketed IPv6 literal — refuse outright
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10 || a === 127 || a === 0 || a >= 224) return null; // private/loopback/multicast
    if (a === 192 && b === 168) return null;
    if (a === 172 && b >= 16 && b <= 31) return null;
    if (a === 169 && b === 254) return null; // link-local / cloud metadata
  }
  return u;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export async function fetchArticleText(url: string): Promise<string> {
  const safe = safePublicUrl(url);
  if (!safe || url.includes("news.google.com") || url.includes("forexfactory.com")) {
    return "";
  }
  try {
    // redirect:"manual" → a 3xx (which could bounce to an internal host) makes
    // fetchWith throw, so we bail to the feed excerpt instead of following it.
    const res = await fetchWith(safe.toString(), {
      headers: { Accept: "text/html,*/*" },
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    if (!(res.headers.get("content-type") ?? "").includes("text/html")) return "";
    const html = (await res.text())
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ");

    const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) =>
        decodeEntities(m[1].replace(/<[^>]+>/g, " "))
          .replace(/\s+/g, " ")
          .trim(),
      )
      // Skip boilerplate (cookie/consent walls, nav, captions) — keep real prose.
      .filter((t) => t.length > 60 && !JUNK_RE.test(t));

    const joined = paragraphs.join(" ").trim();
    // If we couldn't get real prose (consent wall, JS-only app, login page),
    // bail so callers fall back to the cleaner feed excerpt instead of chrome.
    return joined.length >= 180 ? joined.slice(0, 2400) : "";
  } catch {
    return "";
  }
}
