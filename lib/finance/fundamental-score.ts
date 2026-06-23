/**
 * Deterministic fundamental scoring (no LLM).
 *
 * Turns the raw Yahoo figures (lib/providers/fundamentals.ts) into a 0–100
 * score + grade band for each of five pillars — Profitability, Valuation,
 * Cash Flow, Financial Strength, Growth/Forward — plus a weighted composite.
 *
 * The LLM is later handed these scores as ground truth and only *narrates*
 * them in Hebrew; it never recomputes or invents figures. Thresholds follow the
 * design rubric: piecewise-linear anchor curves, weighted blends, graceful
 * degradation when fields are missing (coverage), and explicit edge-case rules.
 */

import type { Fundamentals } from "@/lib/providers/fundamentals";

export type Band = "excellent" | "good" | "fair" | "weak" | "poor";

export type PillarKey =
  | "profitability"
  | "valuation"
  | "cashFlow"
  | "strength"
  | "growth";

export interface PillarScore {
  score: number | null; // 0–100, null when coverage < 0.5
  band: Band | null;
  coverage: number; // 0..1 — share of weight backed by present fields
  /** Hebrew edge-case flags — shown to the user and fed to the LLM. */
  notes: string[];
}

export interface FundamentalScores {
  profitability: PillarScore;
  valuation: PillarScore;
  cashFlow: PillarScore;
  strength: PillarScore;
  growth: PillarScore;
  composite: { score: number | null; band: Band | null };
}

export function scoreToBand(s: number): Band {
  if (s >= 80) return "excellent";
  if (s >= 65) return "good";
  if (s >= 50) return "fair";
  if (s >= 35) return "weak";
  return "poor";
}

/** Piecewise-linear interpolation between ascending [value, score] anchors. */
function curve(x: number, anchors: [number, number][]): number {
  if (x <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, s0] = anchors[i];
    const [x1, s1] = anchors[i + 1];
    if (x >= x0 && x <= x1) return s0 + ((x - x0) / (x1 - x0)) * (s1 - s0);
  }
  return 50;
}

interface Sub {
  score: number | null;
  weight: number;
}

/**
 * Combine weighted sub-metrics, renormalizing over the ones that are present.
 * `floor` is the minimum coverage required to emit a score (default 0.5).
 */
function combine(subs: Sub[], floor = 0.5): { score: number | null; coverage: number } {
  const present = subs.filter((s) => s.score !== null);
  const totalW = subs.reduce((a, s) => a + s.weight, 0);
  const presentW = present.reduce((a, s) => a + s.weight, 0);
  const coverage = totalW ? presentW / totalW : 0;
  if (coverage < floor) return { score: null, coverage };
  const score =
    present.reduce((a, s) => a + (s.score as number) * s.weight, 0) / presentW;
  return { score: Math.round(score), coverage };
}

function pillar(subs: Sub[], notes: string[], floor = 0.5): PillarScore {
  const { score, coverage } = combine(subs, floor);
  return { score, band: score == null ? null : scoreToBand(score), coverage, notes };
}

const has = (n: number | null): n is number => n != null && isFinite(n);

// ---------------------------------------------------------------------------
// 1. Profitability
// ---------------------------------------------------------------------------
function scoreProfitability(f: Fundamentals): PillarScore {
  const notes: string[] = [];

  let roeScore = has(f.returnOnEquity)
    ? curve(f.returnOnEquity, [[-0.1, 0], [0, 30], [0.08, 55], [0.12, 68], [0.2, 85], [0.35, 100]])
    : null;
  // Leverage guard: a huge ROE on a heavily levered balance sheet is not
  // operational quality — cap it.
  if (roeScore != null && has(f.returnOnEquity) && f.returnOnEquity > 0.4 && has(f.debtToEquity) && f.debtToEquity > 200) {
    roeScore = Math.min(roeScore, 70);
    notes.push("תשואה גבוהה על ההון מושפעת ממינוף גבוה.");
  }

  return pillar(
    [
      { score: has(f.profitMargin) ? curve(f.profitMargin, [[-0.1, 0], [0, 30], [0.05, 50], [0.1, 65], [0.2, 82], [0.35, 100]]) : null, weight: 0.3 },
      { score: has(f.operatingMargin) ? curve(f.operatingMargin, [[-0.1, 0], [0, 30], [0.08, 50], [0.15, 68], [0.25, 85], [0.4, 100]]) : null, weight: 0.25 },
      { score: has(f.grossMargin) ? curve(f.grossMargin, [[0, 10], [0.1, 30], [0.2, 50], [0.35, 68], [0.5, 85], [0.7, 100]]) : null, weight: 0.15 },
      { score: roeScore, weight: 0.2 },
      { score: has(f.returnOnAssets) ? curve(f.returnOnAssets, [[-0.05, 0], [0, 30], [0.03, 50], [0.06, 65], [0.12, 85], [0.2, 100]]) : null, weight: 0.1 },
    ],
    notes,
  );
}

// ---------------------------------------------------------------------------
// 2. Valuation (inverse — cheaper = higher score)
// ---------------------------------------------------------------------------
function scoreValuation(f: Fundamentals): PillarScore {
  const notes: string[] = [];

  // Negative/absent trailing earnings → drop trailing P/E.
  const trailingPE = has(f.trailingPE) && f.trailingPE > 0
    ? curve(f.trailingPE, [[8, 100], [12, 90], [18, 70], [25, 55], [40, 30], [60, 10]])
    : null;
  if (!has(f.trailingPE) || (f.trailingPE ?? 0) <= 0) {
    if (has(f.netIncome) && f.netIncome < 0) notes.push("חברה ללא רווח חיובי — מכפיל הרווח אינו רלוונטי.");
  }

  const forwardPE = has(f.forwardPE) && f.forwardPE > 0
    ? curve(f.forwardPE, [[8, 100], [12, 90], [18, 70], [25, 52], [35, 30], [55, 10]])
    : null;
  const peg = has(f.pegRatio) && f.pegRatio > 0
    ? curve(f.pegRatio, [[0.5, 100], [1, 85], [1.5, 68], [2, 52], [3, 30], [4, 12]])
    : null;
  const evEbitda = has(f.enterpriseToEbitda) && f.enterpriseToEbitda > 0
    ? curve(f.enterpriseToEbitda, [[5, 100], [8, 88], [12, 68], [18, 50], [25, 30], [35, 10]])
    : null;
  const ps = has(f.priceToSales) && f.priceToSales > 0
    ? curve(f.priceToSales, [[0.5, 100], [1.5, 82], [3, 65], [6, 48], [10, 28], [18, 8]])
    : null;
  const pb = has(f.priceToBook) && f.priceToBook > 0
    ? curve(f.priceToBook, [[0.8, 100], [1.5, 82], [3, 64], [6, 46], [10, 26], [20, 8]])
    : null;

  // "Priced for perfection" — flag rich sales/book multiples even when earnings
  // multiples are absent (loss-makers), so an expensive growth name can't look cheap.
  if ((has(f.priceToSales) && f.priceToSales > 10) || (has(f.priceToBook) && f.priceToBook > 15)) {
    notes.push("מתומחר לשלמות — מכפילי מכירות/הון גבוהים מאוד.");
  }

  // Valuation is too important to silently drop from the composite. Emit a score
  // whenever even one universal multiple (P/S, P/B) is present (floor 0.2), so a
  // loss-making name without a P/E still carries a valuation read.
  return pillar(
    [
      { score: trailingPE, weight: 0.22 },
      { score: forwardPE, weight: 0.2 },
      { score: peg, weight: 0.18 },
      { score: evEbitda, weight: 0.18 },
      { score: ps, weight: 0.12 },
      { score: pb, weight: 0.1 },
    ],
    notes,
    0.2,
  );
}

// ---------------------------------------------------------------------------
// 3. Cash Flow
// ---------------------------------------------------------------------------
function scoreCashFlow(f: Fundamentals): PillarScore {
  const notes: string[] = [];
  const rev = has(f.totalRevenue) && f.totalRevenue > 0 ? f.totalRevenue : null;

  const fcfMargin = has(f.freeCashflow) && rev
    ? curve(f.freeCashflow / rev, [[-0.05, 0], [0, 30], [0.03, 50], [0.08, 68], [0.15, 85], [0.25, 100]])
    : null;

  let fcfVsOcf: number | null = null;
  if (has(f.freeCashflow) && has(f.operatingCashflow) && f.operatingCashflow > 0) {
    // Capex intensity — only meaningful when operations actually generate cash.
    fcfVsOcf = curve(f.freeCashflow / f.operatingCashflow, [[-0.2, 0], [0, 25], [0.4, 55], [0.6, 72], [0.8, 90], [1, 100]]);
  } else if (has(f.freeCashflow)) {
    // Negative/absent OCF: the ratio's sign inverts and is misleading, so score
    // on FCF sign alone (a cash-burning company must not score high here).
    fcfVsOcf = f.freeCashflow > 0 ? 70 : 20;
  }

  const ocfMargin = has(f.operatingCashflow) && rev
    ? curve(f.operatingCashflow / rev, [[-0.05, 0], [0, 30], [0.08, 52], [0.15, 70], [0.25, 88], [0.4, 100]])
    : null;

  // Cash-conversion quality = FCF / net income. Net income ≈ margin × revenue
  // when Yahoo doesn't give the raw figure.
  const netIncome = has(f.netIncome) ? f.netIncome : has(f.profitMargin) && rev ? f.profitMargin * rev : null;
  let quality: number | null = null;
  if (has(f.freeCashflow) && netIncome != null) {
    if (netIncome <= 0) {
      notes.push("החברה הפסדית — איכות המרת המזומנים אינה ניתנת לחישוב.");
    } else {
      quality = curve(f.freeCashflow / netIncome, [[-0.5, 0], [0.2, 30], [0.5, 52], [0.8, 72], [1, 88], [1.3, 100]]);
    }
  }

  if (has(f.freeCashflow) && f.freeCashflow < 0) notes.push("תזרים מזומנים חופשי שלילי — החברה שורפת מזומנים.");

  return pillar(
    [
      { score: fcfMargin, weight: 0.35 },
      { score: fcfVsOcf, weight: 0.25 },
      { score: ocfMargin, weight: 0.2 },
      { score: quality, weight: 0.2 },
    ],
    notes,
  );
}

// ---------------------------------------------------------------------------
// 4a. Financial Strength
// ---------------------------------------------------------------------------
function scoreStrength(f: Fundamentals, isFinancialSector: boolean): PillarScore {
  const notes: string[] = [];

  let netCash: number | null = null;
  if (has(f.totalCash) && has(f.totalDebt) && has(f.marketCap) && f.marketCap > 0) {
    netCash = curve((f.totalCash - f.totalDebt) / f.marketCap, [[-0.5, 10], [-0.35, 30], [-0.15, 50], [0, 68], [0.1, 85], [0.25, 100]]);
  } else if (has(f.totalCash) && has(f.totalDebt) && f.totalDebt > 0) {
    const ratio = f.totalCash / f.totalDebt;
    netCash = ratio > 1 ? 80 : ratio > 0.5 ? 55 : 30;
  }

  let leverage: number | null = null;
  if (has(f.debtToEquity)) {
    if (f.debtToEquity < 0) {
      leverage = 25;
      notes.push("הון עצמי שלילי במאזן.");
    } else {
      leverage = curve(f.debtToEquity, [[0, 100], [30, 85], [80, 65], [150, 48], [250, 28], [400, 8]]);
    }
  }

  const current = has(f.currentRatio)
    ? curve(f.currentRatio, [[0.5, 15], [0.8, 40], [1, 55], [1.5, 75], [2, 90], [3, 100]])
    : null;
  const quick = has(f.quickRatio)
    ? curve(f.quickRatio, [[0.3, 15], [0.5, 40], [0.7, 55], [1, 75], [1.5, 92], [2.5, 100]])
    : null;

  if (isFinancialSector) {
    notes.push('עבור מוסדות פיננסיים יחסי החוב והנזילות אינם משקפים סיכון כרגיל.');
  }

  return pillar(
    [
      { score: netCash, weight: 0.3 },
      { score: leverage, weight: 0.3 },
      { score: current, weight: 0.22 },
      { score: quick, weight: 0.18 },
    ],
    notes,
  );
}

// ---------------------------------------------------------------------------
// 4b. Growth / Forward
// ---------------------------------------------------------------------------
const REC_SCORE: Record<string, number> = {
  strong_buy: 100, strongbuy: 100,
  buy: 78,
  hold: 52,
  underperform: 30,
  sell: 12, strong_sell: 8, strongsell: 8,
};

function scoreGrowth(f: Fundamentals): PillarScore {
  const notes: string[] = [];

  const revGrowth = has(f.revenueGrowth)
    ? curve(f.revenueGrowth, [[-0.15, 5], [0, 30], [0.03, 48], [0.1, 65], [0.2, 85], [0.4, 100]])
    : has(f.nextYearRevenueGrowth)
      ? curve(f.nextYearRevenueGrowth, [[-0.15, 5], [0, 30], [0.03, 48], [0.1, 65], [0.2, 85], [0.4, 100]])
      : null;

  const earnGrowth = has(f.earningsGrowth)
    ? curve(f.earningsGrowth, [[-0.25, 5], [0, 30], [0.03, 48], [0.12, 65], [0.25, 85], [0.5, 100]])
    : has(f.nextYearEpsGrowth)
      ? curve(f.nextYearEpsGrowth, [[-0.25, 5], [0, 30], [0.03, 48], [0.12, 65], [0.25, 85], [0.5, 100]])
      : null;

  let epsMomentum: number | null = null;
  if (has(f.forwardEps) && has(f.trailingEps)) {
    if (f.trailingEps <= 0) {
      epsMomentum = f.forwardEps > 0 ? 80 : 20;
    } else {
      epsMomentum = curve(f.forwardEps / f.trailingEps - 1, [[-0.25, 5], [-0.1, 30], [0, 52], [0.05, 65], [0.15, 85], [0.3, 100]]);
    }
  }

  let upside: number | null = null;
  if (has(f.targetMeanPrice) && has(f.currentPrice) && f.currentPrice > 0) {
    upside = curve((f.targetMeanPrice - f.currentPrice) / f.currentPrice, [[-0.25, 5], [-0.1, 30], [0, 50], [0.1, 68], [0.25, 88], [0.5, 100]]);
  }

  const recKey = f.recommendationKey ? f.recommendationKey.toLowerCase().replace(/\s+/g, "_") : null;
  const rec = recKey && recKey in REC_SCORE ? REC_SCORE[recKey] : null;

  // Thin analyst coverage is noisy → halve the weight of the analyst-derived subs.
  const thin = !has(f.numberOfAnalysts) || (f.numberOfAnalysts as number) < 3;
  const analystW = thin ? 0.5 : 1;
  if (thin && (upside != null || rec != null)) notes.push("כיסוי אנליסטים דליל — לקונצנזוס משקל מופחת.");

  return pillar(
    [
      { score: revGrowth, weight: 0.25 },
      { score: earnGrowth, weight: 0.25 },
      { score: epsMomentum, weight: 0.15 },
      { score: upside, weight: 0.2 * analystW },
      { score: rec, weight: 0.15 * analystW },
    ],
    notes,
  );
}

const FINANCIAL_SECTORS = ["financial services", "financial", "banks"];

/** Score all five pillars + the weighted composite. */
export function scoreFundamentals(f: Fundamentals, sector?: string | null): FundamentalScores {
  const isFin = !!sector && FINANCIAL_SECTORS.some((s) => sector.toLowerCase().includes(s));

  const profitability = scoreProfitability(f);
  const valuation = scoreValuation(f);
  const cashFlow = scoreCashFlow(f);
  const strength = scoreStrength(f, isFin);
  const growth = scoreGrowth(f);

  // Composite: weight by how much each pillar tells you about quality vs price.
  const W: Record<PillarKey, number> = {
    profitability: 0.25,
    cashFlow: 0.22,
    strength: 0.2,
    growth: 0.18,
    valuation: 0.15,
  };
  const pillars: Record<PillarKey, PillarScore> = { profitability, valuation, cashFlow, strength, growth };
  const live = (Object.keys(W) as PillarKey[]).filter((k) => pillars[k].score != null);
  const wSum = live.reduce((a, k) => a + W[k], 0);
  let composite: { score: number | null; band: Band | null } = { score: null, band: null };
  if (live.length >= 3 && wSum >= 0.5) {
    const s = Math.round(live.reduce((a, k) => a + (pillars[k].score as number) * W[k], 0) / wSum);
    composite = { score: s, band: scoreToBand(s) };
  }

  return { profitability, valuation, cashFlow, strength, growth, composite };
}
