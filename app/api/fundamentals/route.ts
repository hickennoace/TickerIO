import { NextRequest, NextResponse } from "next/server";
import { resolve, quote, dailyCandles, profile } from "@/lib/market";
import { cached } from "@/lib/cache";
import { getFundamentals, type Fundamentals } from "@/lib/providers/fundamentals";
import { scoreFundamentals, scoreToBand, type Band, type PillarScore } from "@/lib/finance/fundamental-score";
import { getNews } from "@/lib/providers/news";
import { computeFearGreed } from "@/lib/finance/fear-greed";
import { technicalScore, computeTrendBias } from "@/lib/finance/trend-bias";
import { llmJson } from "@/lib/ai/llm";
import { formatPrice, formatCompact } from "@/lib/format";
import {
  METRIC, PILLAR_TITLE, BAND_HE, LEAN_HE, recommendationHe,
  fgLabelHe, biasLabelHe, UI, type Lean,
} from "@/lib/i18n/he";
import type { FundMetric, FundPillar, FundamentalsResponse } from "@/lib/api";

export const dynamic = "force-dynamic";
// Bounded headroom for the parallel upstream fetches + the (timed-out) LLM call.
export const maxDuration = 30;

// --------------------------- formatters ---------------------------
const fmtPct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
const fmtSignedPct = (x: number, d = 1) => `${x > 0 ? "+" : ""}${(x * 100).toFixed(d)}%`;
const fmtRatio = (x: number, d = 2) => x.toFixed(d);
function fmtMoney(x: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      notation: "compact", style: "currency", currency, maximumFractionDigits: 2,
    }).format(x);
  } catch {
    return formatCompact(x);
  }
}

const has = (n: number | null | undefined): n is number => n != null && isFinite(n);

/** Treat empty / whitespace-only LLM strings as missing so the heuristic kicks in. */
const pick = (s?: string | null): string | null => (s && s.trim() ? s : null);

/** Build a metric row from an id + formatted value, or null to skip. */
function row(id: string, value: string | null, tone?: "up" | "down"): FundMetric | null {
  if (value == null) return null;
  const m = METRIC[id];
  return { id, label: m?.label ?? id, value, hint: m?.hint ?? "", tone };
}

function pillarBand(score: number | null): { band: Band | null; word: string | null } {
  if (score == null) return { band: null, word: null };
  const band = scoreToBand(score);
  return { band, word: BAND_HE[band].word };
}

/** Weighted blend of two pillar scores (strength + growth → section 4).
 *  Defaults mirror the composite's relative weights (0.20 / 0.18) so the visible
 *  section-4 grade and the composite share one weighting scheme. */
function blend(a: number | null, b: number | null, wa = 0.2, wb = 0.18): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b;
  if (b == null) return a;
  return Math.round((a * wa + b * wb) / (wa + wb));
}

// --------------------------- metric assembly ---------------------------
function profitabilityMetrics(f: Fundamentals): FundMetric[] {
  return [
    row("profitMargin", has(f.profitMargin) ? fmtPct(f.profitMargin) : null),
    row("operatingMargin", has(f.operatingMargin) ? fmtPct(f.operatingMargin) : null),
    row("grossMargin", has(f.grossMargin) ? fmtPct(f.grossMargin) : null),
    row("returnOnEquity", has(f.returnOnEquity) ? fmtPct(f.returnOnEquity) : null),
    row("returnOnAssets", has(f.returnOnAssets) ? fmtPct(f.returnOnAssets) : null),
    row("ebitda", has(f.ebitda) ? fmtMoney(f.ebitda, f.currency) : null),
  ].filter(Boolean) as FundMetric[];
}

function valuationMetrics(f: Fundamentals): FundMetric[] {
  return [
    row("trailingPE", has(f.trailingPE) ? fmtRatio(f.trailingPE) : null),
    row("forwardPE", has(f.forwardPE) ? fmtRatio(f.forwardPE) : null),
    row("pegRatio", has(f.pegRatio) ? fmtRatio(f.pegRatio) : null),
    row("enterpriseToEbitda", has(f.enterpriseToEbitda) ? fmtRatio(f.enterpriseToEbitda) : null),
    row("priceToSales", has(f.priceToSales) ? fmtRatio(f.priceToSales) : null),
    row("priceToBook", has(f.priceToBook) ? fmtRatio(f.priceToBook) : null),
    row("marketCap", has(f.marketCap) ? fmtMoney(f.marketCap, f.currency) : null),
    row("enterpriseValue", has(f.enterpriseValue) ? fmtMoney(f.enterpriseValue, f.currency) : null),
    row("dividendYield", has(f.dividendYield) ? fmtPct(f.dividendYield, 2) : null),
    row("beta", has(f.beta) ? fmtRatio(f.beta) : null),
  ].filter(Boolean) as FundMetric[];
}

function cashFlowMetrics(f: Fundamentals): FundMetric[] {
  return [
    row("freeCashflow", has(f.freeCashflow) ? fmtMoney(f.freeCashflow, f.currency) : null, has(f.freeCashflow) && f.freeCashflow < 0 ? "down" : undefined),
    row("operatingCashflow", has(f.operatingCashflow) ? fmtMoney(f.operatingCashflow, f.currency) : null),
    row("totalRevenue", has(f.totalRevenue) ? fmtMoney(f.totalRevenue, f.currency) : null),
    row("netIncome", has(f.netIncome) ? fmtMoney(f.netIncome, f.currency) : null),
  ].filter(Boolean) as FundMetric[];
}

function strengthForwardMetrics(f: Fundamentals): FundMetric[] {
  const netCash = has(f.totalCash) && has(f.totalDebt) ? f.totalCash - f.totalDebt : null;
  const upside =
    has(f.targetMeanPrice) && has(f.currentPrice) && f.currentPrice > 0
      ? (f.targetMeanPrice - f.currentPrice) / f.currentPrice
      : null;
  return [
    row("totalCash", has(f.totalCash) ? fmtMoney(f.totalCash, f.currency) : null),
    row("totalDebt", has(f.totalDebt) ? fmtMoney(f.totalDebt, f.currency) : null),
    row("netCash", netCash != null ? fmtMoney(netCash, f.currency) : null, netCash != null ? (netCash >= 0 ? "up" : "down") : undefined),
    row("debtToEquity", has(f.debtToEquity) ? `${f.debtToEquity.toFixed(1)}%` : null),
    row("currentRatio", has(f.currentRatio) ? fmtRatio(f.currentRatio) : null),
    row("quickRatio", has(f.quickRatio) ? fmtRatio(f.quickRatio) : null),
    row("revenueGrowth", has(f.revenueGrowth) ? fmtSignedPct(f.revenueGrowth) : null, has(f.revenueGrowth) ? (f.revenueGrowth >= 0 ? "up" : "down") : undefined),
    row("earningsGrowth", has(f.earningsGrowth) ? fmtSignedPct(f.earningsGrowth) : null, has(f.earningsGrowth) ? (f.earningsGrowth >= 0 ? "up" : "down") : undefined),
    row("forwardEps", has(f.forwardEps) ? formatPrice(f.forwardEps, f.currency) : null),
    row("trailingEps", has(f.trailingEps) ? formatPrice(f.trailingEps, f.currency) : null),
    row("targetMeanPrice", has(f.targetMeanPrice) ? formatPrice(f.targetMeanPrice, f.currency) : null),
    row("upside", upside != null ? fmtSignedPct(upside) : null, upside != null ? (upside >= 0 ? "up" : "down") : undefined),
    row("numberOfAnalysts", has(f.numberOfAnalysts) ? String(Math.round(f.numberOfAnalysts)) : null),
    row("recommendationKey", recommendationHe(f.recommendationKey)),
  ].filter(Boolean) as FundMetric[];
}

// --------------------------- LLM context + prompt ---------------------------
interface LlmOut {
  overall?: string;
  pillars?: Record<string, string>;
  news?: { lean?: string; text?: string };
}

function buildContext(args: {
  symbol: string; name: string; assetClass: string; currency: string; price: number;
  fundamentals: Fundamentals; scores: ReturnType<typeof scoreFundamentals>;
  fg: number; bias: number; dayChangePct: number; degraded: boolean;
  news: { title: string; excerpt: string; source: string; ageHours: number }[];
  composite: { score: number | null; word: string | null };
}) {
  const { fundamentals: f, scores, degraded } = args;
  const gradeWord = (p: PillarScore) => (p.band ? BAND_HE[p.band].word : null);
  const upside =
    has(f.targetMeanPrice) && has(f.currentPrice) && f.currentPrice > 0
      ? Math.round(((f.targetMeanPrice - f.currentPrice) / f.currentPrice) * 1000) / 10
      : null;

  return {
    asset: { symbol: args.symbol, name: args.name, assetClass: args.assetClass, currency: args.currency, price: args.price },
    market: {
      marketCapText: has(f.marketCap) ? fmtMoney(f.marketCap, f.currency) : null,
      beta: f.beta,
      dayChangeText: `${args.dayChangePct >= 0 ? "+" : ""}${args.dayChangePct.toFixed(2)}%`,
    },
    fearGreed: { value: args.fg, label: fgLabelHe(args.fg) },
    trendBias: { score: args.bias, label: biasLabelHe(args.bias) },
    pillars: degraded ? null : {
      profitability: {
        grade: gradeWord(scores.profitability), score: scores.profitability.score,
        metrics: {
          profitMargins: f.profitMargin, grossMargins: f.grossMargin, operatingMargins: f.operatingMargin,
          returnOnEquity: f.returnOnEquity, returnOnAssets: f.returnOnAssets,
          ebitdaText: has(f.ebitda) ? fmtMoney(f.ebitda, f.currency) : null,
        },
      },
      valuation: {
        grade: gradeWord(scores.valuation), score: scores.valuation.score,
        metrics: {
          trailingPE: f.trailingPE, forwardPE: f.forwardPE, pegRatio: f.pegRatio,
          enterpriseToEbitda: f.enterpriseToEbitda, priceToSales: f.priceToSales, priceToBook: f.priceToBook,
          dividendYield: f.dividendYield,
        },
      },
      cashFlow: {
        grade: gradeWord(scores.cashFlow), score: scores.cashFlow.score,
        metrics: {
          freeCashflowText: has(f.freeCashflow) ? fmtMoney(f.freeCashflow, f.currency) : null,
          operatingCashflowText: has(f.operatingCashflow) ? fmtMoney(f.operatingCashflow, f.currency) : null,
          totalRevenueText: has(f.totalRevenue) ? fmtMoney(f.totalRevenue, f.currency) : null,
          fcfMargin: has(f.freeCashflow) && has(f.totalRevenue) && f.totalRevenue > 0 ? Math.round((f.freeCashflow / f.totalRevenue) * 1000) / 1000 : null,
        },
      },
      financialStrength: {
        grade: blendWord(scores.strength.score, scores.growth.score),
        metrics: {
          totalCashText: has(f.totalCash) ? fmtMoney(f.totalCash, f.currency) : null,
          totalDebtText: has(f.totalDebt) ? fmtMoney(f.totalDebt, f.currency) : null,
          debtToEquityText: has(f.debtToEquity) ? `${f.debtToEquity.toFixed(1)}%` : null,
          currentRatio: f.currentRatio, quickRatio: f.quickRatio,
          revenueGrowth: f.revenueGrowth, earningsGrowth: f.earningsGrowth,
          forwardEpsText: has(f.forwardEps) ? formatPrice(f.forwardEps, f.currency) : null,
          trailingEpsText: has(f.trailingEps) ? formatPrice(f.trailingEps, f.currency) : null,
          targetMeanPriceText: has(f.targetMeanPrice) ? formatPrice(f.targetMeanPrice, f.currency) : null,
          targetUpsideText: upside != null ? `${upside >= 0 ? "+" : ""}${upside}%` : null,
          recommendationKey: f.recommendationKey, numberOfAnalystOpinions: f.numberOfAnalysts,
        },
      },
    },
    overallGrade: args.composite.word,
    notes: degraded ? [] : [
      ...scores.profitability.notes, ...scores.valuation.notes, ...scores.cashFlow.notes,
      ...scores.strength.notes, ...scores.growth.notes,
    ],
    news: args.news,
  };
}

function blendWord(a: number | null, b: number | null): string | null {
  const s = blend(a, b);
  return s == null ? null : BAND_HE[scoreToBand(s)].word;
}

function buildPrompt(ctx: object): string {
  return (
    `You are a financial data narrator for a dashboard. You ONLY describe pre-computed numbers and provided news. You are NOT an advisor and never give buy/sell/hold guidance.\n\n` +
    `Produce a detailed analysis of the asset in the CONTEXT, as a single JSON object, written ENTIRELY IN HEBREW.\n\n` +
    `ABSOLUTE RULES (apply to every field):\n` +
    `- Write in professional modern Hebrew, in the register of Israeli financial press (Globes/Calcalist). Allowed non-Hebrew: the ticker and finance acronyms (P/E, ROE, FCF, EBITDA, PEG, EPS).\n` +
    `- Use ONLY values present in CONTEXT. Never invent, extrapolate, or re-derive figures. Skip any null/missing value silently.\n` +
    `- Fields whose name ends in "Text" are PRE-FORMATTED (money, prices, percentages, market cap) — copy them verbatim and never transform them.\n` +
    `- Decimal fractions (margins, growth, yields, fcfMargin) are decimals: multiply by 100 for a percent (0.2715 -> "27.1%").\n` +
    `- Ratios/multiples (P/E, forward P/E, PEG, EV/EBITDA, P/S, P/B, current/quick ratio, beta) are shown as-is, e.g. "פי 35.96". One decimal place max for any percent you derive.\n` +
    `- No investment advice, no price targets of your own, no "כדאי/מומלץ לקנות/למכור". You MAY state the analyst consensus as a reported fact.\n` +
    `- Be specific to THIS asset's numbers; explain what is actually going on and the forward outlook. No generic filler.\n` +
    `- Reflect each grade's tone (מצוין/טוב = חיובי, סביר = מעורב, חלש/חלש מאוד = זהירות), but stay descriptive, never prescriptive. Weave the relevant "notes" caveats in.\n` +
    `- If pillars is null (crypto/forex/index), set "pillars" to {} and base "overall" only on market data, the technical/Fear&Greed bias, and the news.\n\n` +
    `OUTPUT — return ONLY this JSON object, no markdown, no preamble:\n` +
    `{\n  "overall": "<4-7 Hebrew sentences: the current situation + forward outlook, combining the grades, valuation, growth, technical/Fear&Greed bias, and what the news implies>",\n` +
    `  "pillars": {\n    "profitability": "<1-2 Hebrew sentences grounded in the numbers>",\n    "valuation": "<1-2 Hebrew sentences>",\n    "cashFlow": "<1-2 Hebrew sentences>",\n    "financialStrength": "<1-2 Hebrew sentences covering balance-sheet strength AND the forward/analyst data>"\n  },\n` +
    `  "news": { "lean": "Bullish|Bearish|Neutral", "text": "<3-5 Hebrew sentences: what the news means fundamentally for the asset>" }\n}\n` +
    `Include in "pillars" only the keys present in CONTEXT.pillars. "lean" must be exactly one of the three English words.\n\n` +
    `CONTEXT:\n${JSON.stringify(ctx)}`
  );
}

// --------------------------- Hebrew heuristic fallback ---------------------------
function pillarVerdictFallback(key: string, f: Fundamentals, p: PillarScore): string {
  const g = p.band ? BAND_HE[p.band].word : "—";
  switch (key) {
    case "profitability":
      return `הרווחיות מדורגת “${g}”: שולי רווח נקי של ${has(f.profitMargin) ? fmtPct(f.profitMargin) : "—"}, שולי גולמי ${has(f.grossMargin) ? fmtPct(f.grossMargin) : "—"} ותשואה על ההון ${has(f.returnOnEquity) ? fmtPct(f.returnOnEquity) : "—"}.`;
    case "valuation":
      return `הערכת השווי מדורגת “${g}”: מכפיל רווח (P/E) של ${has(f.trailingPE) ? fmtRatio(f.trailingPE) : "—"}, מכפיל עתידי ${has(f.forwardPE) ? fmtRatio(f.forwardPE) : "—"} ומכפיל מכירות ${has(f.priceToSales) ? fmtRatio(f.priceToSales) : "—"}.`;
    case "cashFlow":
      return `התזרים מדורג “${g}”: תזרים חופשי (FCF) של ${has(f.freeCashflow) ? fmtMoney(f.freeCashflow, f.currency) : "—"} ותזרים תפעולי ${has(f.operatingCashflow) ? fmtMoney(f.operatingCashflow, f.currency) : "—"} על הכנסות ${has(f.totalRevenue) ? fmtMoney(f.totalRevenue, f.currency) : "—"}.`;
    default:
      return `האיתנות הפיננסית מדורגת “${g}”: יחס חוב להון של ${has(f.debtToEquity) ? fmtRatio(f.debtToEquity, 1) : "—"}, יחס שוטף ${has(f.currentRatio) ? fmtRatio(f.currentRatio) : "—"}, צמיחת הכנסות ${has(f.revenueGrowth) ? fmtSignedPct(f.revenueGrowth) : "—"} ומחיר יעד ממוצע ${has(f.targetMeanPrice) ? formatPrice(f.targetMeanPrice, f.currency) : "—"}.`;
  }
}

function overviewFallback(args: {
  name: string; symbol: string; degraded: boolean; f: Fundamentals;
  compositeWord: string | null; bias: number; fg: number; price: number; currency: string; dayChangePct: number;
  marketCapText: string | null;
}): string {
  if (args.degraded) {
    const dir = args.dayChangePct >= 0 ? `עלייה של ${args.dayChangePct.toFixed(2)}%` : `ירידה של ${Math.abs(args.dayChangePct).toFixed(2)}%`;
    return `${args.name} (${args.symbol}) נסחר סביב ${formatPrice(args.price, args.currency)}, ${dir} ביום המסחר. המגמה הטכנית מסומנת כ“${biasLabelHe(args.bias)}” ומדד הפחד והחמדנות עומד על ${args.fg} (${fgLabelHe(args.fg)}). הניתוח מבוסס על נתוני שוק וחדשות בלבד — לנכס מסוג זה אין דוחות כספיים פונדמנטליים.`;
  }
  const f = args.f;
  const upTxt =
    has(f.targetMeanPrice) && has(f.currentPrice) && f.currentPrice > 0
      ? (() => {
          const u = ((f.targetMeanPrice - f.currentPrice) / f.currentPrice) * 100;
          return u >= 0 ? `פוטנציאל עלייה של ${u.toFixed(1)}% אל יעד האנליסטים הממוצע` : `פער של ${u.toFixed(1)}% אל יעד האנליסטים הממוצע`;
        })()
      : "";
  return [
    `${args.name} (${args.symbol}) מקבל דירוג כולל “${args.compositeWord ?? "—"}”.`,
    `הרווחיות מתבטאת בשולי רווח נקי של ${has(f.profitMargin) ? fmtPct(f.profitMargin) : "—"}, מול הערכת שווי במכפיל רווח של ${has(f.trailingPE) ? fmtRatio(f.trailingPE) : "—"}.`,
    `התזרים החופשי עומד על ${has(f.freeCashflow) ? fmtMoney(f.freeCashflow, f.currency) : "—"} וצמיחת ההכנסות על ${has(f.revenueGrowth) ? fmtSignedPct(f.revenueGrowth) : "—"}.`,
    `המגמה הטכנית “${biasLabelHe(args.bias)}” ומדד הפחד והחמדנות ${args.fg} (${fgLabelHe(args.fg)})${upTxt ? `, עם ${upTxt}` : ""}.`,
    `הנתונים מבוססים על Yahoo Finance ואינם מהווים ייעוץ השקעות.`,
  ].join(" ");
}

// --------------------------- builder ---------------------------
async function build(symbolInput: string): Promise<FundamentalsResponse> {
  const r = resolve(symbolInput);
  const [{ value: q }, { value: candles }, news, f, prof] = await Promise.all([
    quote(symbolInput),
    dailyCandles(symbolInput),
    cached(`news:${r.symbol}`, 600, () => getNews(r.symbol)).then((x) => x.value).catch(() => []),
    getFundamentals(r.symbol, r.assetClass),
    profile(symbolInput).then((x) => x.value).catch(() => null),
  ]);

  const fg = computeFearGreed(candles).score;
  const bias = computeTrendBias(technicalScore(candles), Math.round((fg - 50) * 2)).bias;
  const degraded = !f.available;
  const scores = scoreFundamentals(f, prof?.sector ?? null);

  const composite = degraded
    ? { score: null as number | null, word: null as string | null }
    : { score: scores.composite.score, word: scores.composite.band ? BAND_HE[scores.composite.band].word : null };

  const newsForLlm = (news as { headline: string; description?: string; source: string; publishedAt: string }[])
    .slice(0, 6)
    .map((n) => ({
      title: n.headline,
      excerpt: (n.description ?? "").slice(0, 220),
      source: n.source,
      ageHours: Math.max(0, Math.round((Date.now() - new Date(n.publishedAt).getTime()) / 3_600_000)),
    }));

  const ctx = buildContext({
    symbol: q.display, name: q.name, assetClass: r.assetClass, currency: f.currency || q.currency,
    price: q.price, fundamentals: f, scores, fg, bias, dayChangePct: q.changePct, degraded,
    news: newsForLlm, composite,
  });

  // Hebrew is token-dense; give the merged narrative room so it isn't truncated
  // (a cut-off JSON would collapse the whole answer to the heuristic).
  const llm = await llmJson<LlmOut>(buildPrompt(ctx), 2000).catch(() => null);

  // News section
  const rawLean = llm?.value.news?.lean;
  const lean: Lean = rawLean === "Bullish" || rawLean === "Bearish" || rawLean === "Neutral" ? rawLean : "Neutral";
  const newsText =
    pick(llm?.value.news?.text) ??
    (newsForLlm.length
      ? "להלן עיקרי החדשות העדכניות; ניתוח פונדמנטלי אוטומטי אינו זמין כעת."
      : "אין כותרות חדשות עדכניות לנייר זה.");

  const overview =
    pick(llm?.value.overall) ??
    overviewFallback({
      name: q.name, symbol: q.display, degraded, f, compositeWord: composite.word,
      bias, fg, price: q.price, currency: f.currency || q.currency, dayChangePct: q.changePct,
      marketCapText: has(f.marketCap) ? fmtMoney(f.marketCap, f.currency) : null,
    });

  const generatedBy = llm ? llm.by : "heuristic";

  // Pillars (equities only)
  let pillars: FundPillar[] = [];
  if (!degraded) {
    const sfScore = blend(scores.strength.score, scores.growth.score);
    const mk = (
      key: string, title: string, ps: PillarScore, scoreOverride: number | null,
      metrics: FundMetric[], llmKey: string, fallback: string,
    ): FundPillar => {
      const score = scoreOverride;
      const { band, word } = pillarBand(score);
      return {
        key, title, score, band, bandWord: word,
        verdict: pick(llm?.value.pillars?.[llmKey]) ?? fallback,
        metrics,
        notes: ps.notes,
      };
    };
    pillars = [
      mk("profitability", PILLAR_TITLE.profitability, scores.profitability, scores.profitability.score, profitabilityMetrics(f), "profitability", pillarVerdictFallback("profitability", f, scores.profitability)),
      mk("valuation", PILLAR_TITLE.valuation, scores.valuation, scores.valuation.score, valuationMetrics(f), "valuation", pillarVerdictFallback("valuation", f, scores.valuation)),
      mk("cashFlow", PILLAR_TITLE.cashFlow, scores.cashFlow, scores.cashFlow.score, cashFlowMetrics(f), "cashFlow", pillarVerdictFallback("cashFlow", f, scores.cashFlow)),
      {
        key: "strengthForward",
        title: PILLAR_TITLE.strengthForward,
        score: sfScore,
        ...(() => { const { band, word } = pillarBand(sfScore); return { band, bandWord: word }; })(),
        verdict: pick(llm?.value.pillars?.financialStrength) ?? pillarVerdictFallback("strength", f, scores.strength),
        metrics: strengthForwardMetrics(f),
        notes: [...scores.strength.notes, ...scores.growth.notes],
      },
    ];
  }

  // Market read for degraded assets (from the quote).
  const marketRead: FundMetric[] = degraded
    ? ([
        { id: "price", label: UI.previousClose, value: formatPrice(q.previousClose, q.currency), hint: "" },
        q.dayLow != null && q.dayHigh != null
          ? { id: "dayRange", label: UI.dayRange, value: `${formatPrice(q.dayLow, q.currency)} – ${formatPrice(q.dayHigh, q.currency)}`, hint: "" }
          : null,
        q.fiftyTwoWeekLow != null && q.fiftyTwoWeekHigh != null
          ? { id: "w52", label: UI.week52Range, value: `${formatPrice(q.fiftyTwoWeekLow, q.currency)} – ${formatPrice(q.fiftyTwoWeekHigh, q.currency)}`, hint: "" }
          : null,
        { id: "exchange", label: UI.exchange, value: q.exchange || "—", hint: "" },
      ].filter(Boolean) as FundMetric[])
    : [];

  return {
    symbol: r.symbol,
    display: q.display,
    degraded,
    composite: composite.score,
    compositeBand: scores.composite.band,
    compositeWord: composite.word,
    overview,
    pillars,
    marketRead,
    news: { lean, label: LEAN_HE[lean].label, text: newsText },
    generatedBy,
    asOf: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  try {
    const r = resolve(symbol);
    // The whole analysis (incl. the LLM narrative) barely moves intraday → cache 15 min.
    const { value } = await cached(`fundamentals:${r.symbol}`, 900, () => build(symbol));
    return NextResponse.json(value);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
