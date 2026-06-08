import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { summarizeArticle } from "@/lib/article-summary";

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
    const { value } = await cached(key, 86_400, () =>
      summarizeArticle(symbol, headline, description, url),
    );
    return NextResponse.json(value);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
