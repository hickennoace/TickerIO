/**
 * Transparent 2-stage discounted-cash-flow fair value (pure).
 *
 * A deliberately simple, fully-disclosed model — NOT advice. Stage 1 grows the
 * latest free cash flow for 5 years at a capped growth rate, stage 2 applies a
 * terminal growth rate, all discounted at a CAPM-style rate derived from beta.
 * Also runs the model in reverse to report the growth the current price implies.
 */

export interface DcfAssumptions {
  years: number;
  growthPct: number; // stage-1 annual growth used, %
  terminalGrowthPct: number;
  discountRatePct: number;
}

export interface DcfResult {
  fairValue: number; // per share
  upsidePct: number | null; // vs current price
  impliedGrowthPct: number | null; // reverse-DCF: stage-1 growth the price implies
  assumptions: DcfAssumptions;
}

export interface DcfInput {
  freeCashflow: number | null;
  sharesOutstanding: number | null;
  price: number | null;
  beta: number | null;
  /** Forward growth estimate as a fraction (revenue/earnings growth). */
  growth: number | null;
}

const RISK_FREE = 0.045;
const EQUITY_PREMIUM = 0.05;
const TERMINAL_GROWTH = 0.025;
const STAGE1_YEARS = 5;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** CAPM discount rate from beta, clamped to a sane 7–14% band. */
function discountRate(beta: number | null): number {
  const b = beta != null && isFinite(beta) ? beta : 1;
  return clamp(RISK_FREE + b * EQUITY_PREMIUM, 0.07, 0.14);
}

/** Present value of a 2-stage FCF stream for a given stage-1 growth + rate. */
function presentValue(fcf: number, growth: number, rate: number): number {
  let pv = 0;
  let cf = fcf;
  for (let y = 1; y <= STAGE1_YEARS; y++) {
    cf = cf * (1 + growth);
    pv += cf / Math.pow(1 + rate, y);
  }
  // Terminal value (Gordon growth) discounted back from the final stage-1 year.
  const terminal = (cf * (1 + TERMINAL_GROWTH)) / (rate - TERMINAL_GROWTH);
  pv += terminal / Math.pow(1 + rate, STAGE1_YEARS);
  return pv;
}

export function valuationDcf(input: DcfInput): DcfResult | null {
  const { freeCashflow: fcf, sharesOutstanding: shares, price, beta, growth } = input;
  // Only meaningful with positive FCF and a share count.
  if (fcf == null || shares == null || fcf <= 0 || shares <= 0) return null;

  const rate = discountRate(beta);
  // Stage-1 growth: forward estimate, capped to a defensible 3–15% (and floored
  // above the terminal rate so the model is coherent).
  const g = clamp(growth != null && isFinite(growth) ? growth : 0.06, 0.03, 0.15);

  const fairValue = presentValue(fcf, g, rate) / shares;
  const upsidePct = price != null && price > 0 ? ((fairValue - price) / price) * 100 : null;

  // Reverse DCF: bisect for the stage-1 growth that reproduces today's price.
  let impliedGrowthPct: number | null = null;
  if (price != null && price > 0) {
    const target = price * shares;
    let lo = -0.1;
    let hi = 0.4;
    if (presentValue(fcf, lo, rate) <= target && presentValue(fcf, hi, rate) >= target) {
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (presentValue(fcf, mid, rate) > target) hi = mid;
        else lo = mid;
      }
      impliedGrowthPct = ((lo + hi) / 2) * 100;
    }
  }

  return {
    fairValue,
    upsidePct,
    impliedGrowthPct,
    assumptions: {
      years: STAGE1_YEARS,
      growthPct: g * 100,
      terminalGrowthPct: TERMINAL_GROWTH * 100,
      discountRatePct: rate * 100,
    },
  };
}
