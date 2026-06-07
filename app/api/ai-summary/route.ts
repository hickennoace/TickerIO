import { NextRequest, NextResponse } from "next/server";
import { dailyCandles, quote } from "@/lib/market";
import { cached, fetchJson } from "@/lib/cache";
import { computeTimeframes } from "@/lib/finance/periods";
import { computeFearGreed, fgLabel } from "@/lib/finance/fear-greed";
import { technicalScore, computeTrendBias } from "@/lib/finance/trend-bias";
import { getNews } from "@/lib/providers/news";
import { resolve } from "@/lib/market";

export const dynamic = "force-dynamic";

type Lean = "Bearish" | "Neutral" | "Bullish";

function lean(bias: number): Lean {
  if (bias <= -20) return "Bearish";
  if (bias >= 20) return "Bullish";
  return "Neutral";
}

interface Context {
  display: string;
  assetClass: string;
  price: number;
  currency: string;
  dayPct: number;
  weekPct: number;
  ytdPct: number;
  fg: number;
  fgLabel: string;
  bias: number;
  biasLean: Lean;
  headlines: string[];
}

async function buildContext(symbol: string): Promise<Context> {
  const r = resolve(symbol);
  const [{ value: candles }, { value: q }, news] = await Promise.all([
    dailyCandles(symbol),
    quote(symbol),
    cached(`news:${r.symbol}`, 600, () => getNews(r.symbol)).then((x) => x.value).catch(() => []),
  ]);
  const tz = r.assetClass === "equity" || r.assetClass === "index" ? q.exchangeTz : "UTC";
  const rows = computeTimeframes(
    candles.map((c) => ({ t: c.t, o: c.o, c: c.c })),
    q.price,
    tz,
    r.assetClass,
    Date.now(),
  );
  const find = (l: string) => rows.find((x) => x.label === l)?.changePct ?? 0;
  const fg = computeFearGreed(candles);
  const tech = technicalScore(candles);
  const bias = computeTrendBias(tech, Math.round((fg.score - 50) * 2));
  return {
    display: q.display,
    assetClass: r.assetClass,
    price: q.price,
    currency: q.currency,
    dayPct: find("Day"),
    weekPct: find("Week"),
    ytdPct: find("YTD"),
    fg: fg.score,
    fgLabel: fgLabel(fg.score),
    bias: bias.bias,
    biasLean: lean(bias.bias),
    headlines: news.slice(0, 5).map((n) => n.headline),
  };
}

function heuristic(c: Context): string {
  const wk = c.weekPct >= 0 ? "up" : "down";
  const tone =
    c.biasLean === "Bullish"
      ? "momentum favors continuation"
      : c.biasLean === "Bearish"
      ? "momentum warns of caution"
      : "the tape is balanced with no clear edge";
  const news = c.headlines.length
    ? ` Recent headlines center on: ${c.headlines[0]}.`
    : "";
  return (
    `${c.display} reads ${c.biasLean.toLowerCase()} near-term. It is ${wk} ${Math.abs(
      c.weekPct,
    ).toFixed(1)}% on the week and ${c.ytdPct >= 0 ? "up" : "down"} ${Math.abs(c.ytdPct).toFixed(
      1,
    )}% YTD, with a Fear & Greed reading of ${c.fg} (${c.fgLabel}). With bias at ${c.bias}, ${tone}.` +
    news
  );
}

async function withGroq(c: Context): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const prompt =
    `You are a sell-side desk analyst. In 2-3 tight sentences, give the bottom-line read for ${c.display}. ` +
    `Data: price ${c.price} ${c.currency}; day ${c.dayPct.toFixed(2)}%, week ${c.weekPct.toFixed(
      2,
    )}%, YTD ${c.ytdPct.toFixed(2)}%; Fear&Greed ${c.fg} (${c.fgLabel}); trend bias ${c.bias} (${c.biasLean}). ` +
    `Headlines: ${c.headlines.join(" | ") || "none"}. No disclaimers, no preamble.`;
  try {
    const data = await fetchJson<{ choices: { message: { content: string } }[] }>(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 200,
        }),
      },
    );
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const ctx = await buildContext(symbol);
    const llm = await withGroq(ctx);
    return NextResponse.json({
      summary: llm ?? heuristic(ctx),
      sentiment: ctx.biasLean,
      generatedBy: llm ? "groq:llama-3.3-70b" : "heuristic",
      disclaimer: "AI-generated analysis, not financial advice.",
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
