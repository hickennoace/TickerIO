import { describe, it, expect } from "vitest";
import { scoreFundamentals, scoreToBand } from "./fundamental-score";
import type { Fundamentals } from "@/lib/providers/fundamentals";

/** A fundamentals object with everything null — override only what a test needs. */
function fund(over: Partial<Fundamentals> = {}): Fundamentals {
  return {
    available: true,
    assetClass: "equity",
    currency: "USD",
    profitMargin: null, grossMargin: null, operatingMargin: null,
    returnOnEquity: null, returnOnAssets: null, ebitda: null, netIncome: null,
    trailingPE: null, forwardPE: null, pegRatio: null, priceToBook: null,
    priceToSales: null, enterpriseToEbitda: null, enterpriseToRevenue: null,
    marketCap: null, enterpriseValue: null, dividendYield: null, payoutRatio: null, beta: null,
    freeCashflow: null, operatingCashflow: null, totalRevenue: null,
    totalCash: null, totalDebt: null, debtToEquity: null, currentRatio: null, quickRatio: null,
    revenueGrowth: null, earningsGrowth: null, trailingEps: null, forwardEps: null,
    nextYearEpsGrowth: null, nextYearRevenueGrowth: null,
    targetMeanPrice: null, targetHighPrice: null, targetLowPrice: null, currentPrice: null,
    recommendationKey: null, numberOfAnalysts: null,
    ...over,
  };
}

describe("scoreToBand boundaries", () => {
  it("maps scores to the five bands at the exact thresholds", () => {
    expect(scoreToBand(0)).toBe("poor");
    expect(scoreToBand(34)).toBe("poor");
    expect(scoreToBand(35)).toBe("weak");
    expect(scoreToBand(49)).toBe("weak");
    expect(scoreToBand(50)).toBe("fair");
    expect(scoreToBand(64)).toBe("fair");
    expect(scoreToBand(65)).toBe("good");
    expect(scoreToBand(79)).toBe("good");
    expect(scoreToBand(80)).toBe("excellent");
    expect(scoreToBand(100)).toBe("excellent");
  });
});

describe("scoreFundamentals — pillars", () => {
  it("rates a strong, cheap, cash-generative company highly", () => {
    const s = scoreFundamentals(fund({
      profitMargin: 0.25, grossMargin: 0.6, operatingMargin: 0.3, returnOnEquity: 0.25, returnOnAssets: 0.15,
      trailingPE: 11, forwardPE: 10, pegRatio: 0.9, enterpriseToEbitda: 7, priceToSales: 1.2, priceToBook: 1.4,
      freeCashflow: 30, operatingCashflow: 35, totalRevenue: 100, netIncome: 25,
      totalCash: 50, totalDebt: 10, debtToEquity: 20, currentRatio: 2.5, quickRatio: 1.8, marketCap: 200,
      revenueGrowth: 0.25, earningsGrowth: 0.3, trailingEps: 5, forwardEps: 6,
      targetMeanPrice: 130, currentPrice: 100, recommendationKey: "buy", numberOfAnalysts: 20,
    }));
    expect(s.profitability.band).toBe("excellent");
    expect(s.valuation.score! ).toBeGreaterThan(70);
    expect(s.cashFlow.band).toBe("excellent");
    expect(s.composite.score!).toBeGreaterThan(75);
  });

  it("penalizes an expensive, high-multiple name on valuation even when profitable", () => {
    const s = scoreFundamentals(fund({
      profitMargin: 0.27, operatingMargin: 0.32, grossMargin: 0.47, returnOnEquity: 1.4, returnOnAssets: 0.26,
      trailingPE: 36, forwardPE: 31, pegRatio: 2.4, enterpriseToEbitda: 27, priceToSales: 9.7, priceToBook: 41,
    }));
    expect(s.profitability.band).toBe("excellent");
    expect(s.valuation.score!).toBeLessThan(45); // expensive → weak/poor
  });

  it("keeps Valuation in the composite for a loss-maker with only P/S and P/B (floor 0.2)", () => {
    const s = scoreFundamentals(fund({
      priceToSales: 14, priceToBook: 18, // no P/E (negative earnings), only universal multiples
      netIncome: -50, totalRevenue: 100,
    }));
    expect(s.valuation.score).not.toBeNull(); // does NOT silently drop
    expect(s.valuation.notes.join(" ")).toContain("מתומחר לשלמות");
  });

  it("does not award a perfect cash-flow sub-score to a cash-burning company (negative OCF)", () => {
    const burning = scoreFundamentals(fund({
      freeCashflow: -150, operatingCashflow: -100, totalRevenue: 100, netIncome: -120,
    }));
    const healthy = scoreFundamentals(fund({
      freeCashflow: 22, operatingCashflow: 30, totalRevenue: 100, netIncome: 20,
    }));
    expect(burning.cashFlow.score!).toBeLessThan(healthy.cashFlow.score!);
    expect(burning.cashFlow.band).toBe("poor");
  });

  it("returns null pillar scores when coverage is below the floor", () => {
    const s = scoreFundamentals(fund({ profitMargin: 0.2 })); // only 1 of 5 profitability subs
    expect(s.profitability.score).toBeNull();
    expect(s.profitability.coverage).toBeLessThan(0.5);
  });

  it("flags negative shareholder equity rather than reading it as low debt", () => {
    const s = scoreFundamentals(fund({
      debtToEquity: -50, currentRatio: 1.2, quickRatio: 0.9, totalCash: 10, totalDebt: 80, marketCap: 100,
    }));
    expect(s.strength.notes.join(" ")).toContain("הון עצמי שלילי");
  });

  it("withholds the composite when too few pillars have data", () => {
    const s = scoreFundamentals(fund({ profitMargin: 0.2, grossMargin: 0.5, operatingMargin: 0.3, returnOnEquity: 0.2, returnOnAssets: 0.1 }));
    // Only profitability is scorable → fewer than 3 pillars → no composite.
    expect(s.composite.score).toBeNull();
  });
});
