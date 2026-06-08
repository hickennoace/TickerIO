import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { summarizeArticle, type ArticleSummary } from "@/lib/article-summary";

export const dynamic = "force-dynamic";

/** Stable short hash so the same article never re-triggers the LLM. */
function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

interface Body {
  symbol?: string;
  headline?: string;
  description?: string;
  url?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { symbol = "", headline = "", description = "", url = "" } = body;
  if (!headline && !url) {
    return NextResponse.json({ error: "headline or url required" }, { status: 400 });
  }

  try {
    const key = `article-summary:${hash(url || headline)}`;
    const hit = cacheGet<ArticleSummary>(key);
    if (hit) return NextResponse.json(hit);

    const value = await summarizeArticle(symbol, headline, description, url);
    // Cache real LLM summaries for a day; cache fallbacks/unavailable briefly so
    // a transient LLM hiccup (rate limit) retries soon instead of sticking 24h.
    const isLlm = /gemini|groq/i.test(value.generatedBy);
    cacheSet(key, value, isLlm ? 86_400 : 600);
    return NextResponse.json(value);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
