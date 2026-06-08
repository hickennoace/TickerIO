/**
 * Best-effort article body extractor. Fetches a news URL and pulls the readable
 * paragraph text so the summarizer has the real story, not just the headline.
 *
 * Deliberately lightweight (no headless browser): drop scripts/styles, collect
 * <p> text. Returns "" on anything it can't fetch/parse so callers fall back to
 * the feed excerpt. Skips redirect-only sources (Google News, Forex Factory).
 */

import { fetchWith } from "@/lib/cache";

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
      // Skip boilerplate (cookie notices, bylines, captions) — keep real prose.
      .filter((t) => t.length > 60);

    return paragraphs.join(" ").slice(0, 2400);
  } catch {
    return "";
  }
}
