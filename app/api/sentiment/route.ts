import { NextRequest, NextResponse } from "next/server";
import { dailyCandles } from "@/lib/market";
import { cached } from "@/lib/cache";
import { computeFearGreed, fgLabel } from "@/lib/finance/fear-greed";
import { getCryptoFng } from "@/lib/providers/altfng";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const { value: candles, resolved } = await dailyCandles(symbol);
    const composite = computeFearGreed(candles);

    let score = composite.score;
    let source = "TickerIO composite";

    // For crypto, blend Alternative.me's industry index (best-effort).
    if (resolved.assetClass === "crypto") {
      try {
        const { value: ext } = await cached("fng:crypto", 3600, getCryptoFng);
        score = Math.round(composite.score * 0.5 + ext.score * 0.5);
        source = "Alternative.me + TickerIO composite";
      } catch {
        /* fall back to composite only */
      }
    }

    return NextResponse.json({
      score,
      label: fgLabel(score),
      breakdown: composite,
      source,
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
