import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { resolve } from "@/lib/market";
import { getNews } from "@/lib/providers/news";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const r = resolve(symbol);
    const { value } = await cached(`news:${r.symbol}`, 600, () => getNews(r.symbol));
    return NextResponse.json({ items: value, source: "Yahoo Finance", asOf: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg, items: [] }, { status: 200 });
  }
}
