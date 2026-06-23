import { describe, it, expect } from "vitest";
import { valuationDcf } from "./dcf";
import { summarizeTrends } from "./trends";
import type { FinancialHistory } from "@/lib/providers/financials-history";

describe("valuationDcf", () => {
  it("returns null when FCF is missing, zero or negative, or shares are absent", () => {
    expect(valuationDcf({ freeCashflow: null, sharesOutstanding: 100, price: 10, beta: 1, growth: 0.1 })).toBeNull();
    expect(valuationDcf({ freeCashflow: -50, sharesOutstanding: 100, price: 10, beta: 1, growth: 0.1 })).toBeNull();
    expect(valuationDcf({ freeCashflow: 100, sharesOutstanding: null, price: 10, beta: 1, growth: 0.1 })).toBeNull();
  });

  it("produces a positive fair value and an upside vs price for a cash-generative company", () => {
    const r = valuationDcf({ freeCashflow: 1_000, sharesOutstanding: 1_000, price: 8, beta: 1, growth: 0.08 });
    expect(r).not.toBeNull();
    expect(r!.fairValue).toBeGreaterThan(0);
    expect(r!.upsidePct).toBeCloseTo(((r!.fairValue - 8) / 8) * 100, 4);
    // discount rate from beta=1 → 4.5% + 5% = 9.5%, within the clamp band.
    expect(r!.assumptions.discountRatePct).toBeCloseTo(9.5, 1);
  });

  it("clamps stage-1 growth into the 3–15% band", () => {
    const hot = valuationDcf({ freeCashflow: 100, sharesOutstanding: 100, price: 10, beta: 1, growth: 0.9 });
    const cold = valuationDcf({ freeCashflow: 100, sharesOutstanding: 100, price: 10, beta: 1, growth: -0.5 });
    expect(hot!.assumptions.growthPct).toBeCloseTo(15, 5);
    expect(cold!.assumptions.growthPct).toBeCloseTo(3, 5);
  });
});

describe("summarizeTrends", () => {
  const hist: FinancialHistory = {
    years: [
      { year: 2022, revenue: 100, grossProfit: 40, operatingIncome: 20, netIncome: 10 },
      { year: 2023, revenue: 120, grossProfit: 50, operatingIncome: 26, netIncome: 14 },
      { year: 2024, revenue: 150, grossProfit: 66, operatingIncome: 36, netIncome: 21 },
    ],
  };

  it("computes per-year margins, CAGR and an expanding-margin direction", () => {
    const t = summarizeTrends(hist);
    expect(t.points[0].netMargin).toBeCloseTo(0.1, 4);
    expect(t.points[2].netMargin).toBeCloseTo(0.14, 4);
    // revenue 100→150 over 2 periods → ~22.5% CAGR.
    expect(t.revenueCagr!).toBeCloseTo(Math.sqrt(1.5) - 1, 4);
    expect(t.marginDirection).toBe("expanding");
  });

  it("returns null CAGR when a value is non-positive (sign change)", () => {
    const t = summarizeTrends({
      years: [
        { year: 2022, revenue: 100, grossProfit: 10, operatingIncome: -5, netIncome: -8 },
        { year: 2023, revenue: 120, grossProfit: 20, operatingIncome: 5, netIncome: 12 },
      ],
    });
    expect(t.earningsCagr).toBeNull();
    expect(t.revenueCagr).not.toBeNull();
  });
});
