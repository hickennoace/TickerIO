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
  if (!url || url.includes("news.google.com") || url.includes("forexfactory.com")) {
    return "";
  }
  try {
    const res = await fetchWith(url, { headers: { Accept: "text/html,*/*" } });
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
