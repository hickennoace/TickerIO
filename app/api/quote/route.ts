import { NextRequest, NextResponse } from "next/server";
import { quote } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  try {
    const { value, stale } = await quote(symbol);
    return NextResponse.json({ ...value, stale });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: `Could not load ${symbol}: ${msg}` }, { status: 502 });
  }
}
