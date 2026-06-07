import { describe, it, expect } from "vitest";
import { computeTimeframes, type DailyCandle } from "./periods";

/**
 * Acceptance tests for anchored timeframes (CLAUDE.md §4.4).
 * Anchors must be period-OPENs, never rolling lookbacks.
 */

const DAY = 24 * 3600 * 1000;

/** Build a daily candle at a given UTC date string, open=close=price. */
function c(dateUtc: string, price: number): DailyCandle {
  const t = Date.parse(`${dateUtc}T00:00:00Z`);
  return { t, o: price, c: price };
}

describe("computeTimeframes — crypto (UTC, 24/7)", () => {
  // A run of daily candles through a Wednesday.
  const candles: DailyCandle[] = [
    c("2026-05-25", 100), // Mon (prev week)
    c("2026-06-01", 110), // Mon (this week open)
    c("2026-06-02", 112), // Tue
    c("2026-06-03", 115), // Wed (today)
  ];
  const now = Date.parse("2026-06-03T12:00:00Z"); // Wednesday
  const rows = computeTimeframes(candles, 120, "UTC", "crypto", now);
  const byLabel = (l: string) => rows.find((r) => r.label === l)!;

  it("weekly anchors to THIS Monday's open, not 7 days ago", () => {
    const week = byLabel("Week");
    expect(new Date(week.anchorAt).toISOString()).toBe("2026-06-01T00:00:00.000Z");
    // 120 vs 110 open
    expect(week.changePct).toBeCloseTo(((120 - 110) / 110) * 100, 6);
  });

  it("daily anchors to today's 00:00 UTC open", () => {
    const day = byLabel("Day");
    expect(new Date(day.anchorAt).toISOString()).toBe("2026-06-03T00:00:00.000Z");
    expect(day.changePct).toBeCloseTo(((120 - 115) / 115) * 100, 6);
  });

  it("month anchors to the 1st open", () => {
    expect(new Date(byLabel("Month").anchorAt).toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });
});

describe("computeTimeframes — YTD edge cases", () => {
  it("YTD on Jan 1 is ~0% (current vs year open), never NaN", () => {
    const candles: DailyCandle[] = [c("2026-01-01", 200)];
    const now = Date.parse("2026-01-01T06:00:00Z");
    const rows = computeTimeframes(candles, 200, "UTC", "crypto", now);
    const ytd = rows.find((r) => r.label === "YTD")!;
    expect(Number.isNaN(ytd.changePct)).toBe(false);
    expect(ytd.changePct).toBeCloseTo(0, 6);
  });

  it("YTD anchors to the first trading day of the current year", () => {
    const candles: DailyCandle[] = [
      c("2025-12-31", 90),
      c("2026-01-02", 100), // first trading day of 2026
      c("2026-03-10", 130),
    ];
    const now = Date.parse("2026-03-10T12:00:00Z");
    const rows = computeTimeframes(candles, 130, "UTC", "crypto", now);
    const ytd = rows.find((r) => r.label === "YTD")!;
    expect(new Date(ytd.anchorAt).toISOString()).toBe("2026-01-02T00:00:00.000Z");
    expect(ytd.changePct).toBeCloseTo(30, 6);
  });
});

describe("computeTimeframes — equity weekend behaviour", () => {
  it("on a weekend, Day falls back to the last trading session (not a flat Saturday)", () => {
    const candles: DailyCandle[] = [
      c("2026-06-04", 50), // Thu
      c("2026-06-05", 52), // Fri (last session)
    ];
    const now = Date.parse("2026-06-06T12:00:00Z"); // Saturday — no candle
    const rows = computeTimeframes(candles, 55, "America/New_York", "equity", now);
    const day = rows.find((r) => r.label === "Day")!;
    // Falls back to Friday's open (52), not undefined/NaN.
    expect(day.changePct).toBeCloseTo(((55 - 52) / 52) * 100, 6);
    expect(Number.isNaN(day.changePct)).toBe(false);
  });
});

describe("computeTimeframes — 1Y rolling", () => {
  it("anchors to the candle closest to one year ago", () => {
    const candles: DailyCandle[] = [];
    for (let i = 400; i >= 0; i -= 5) {
      candles.push({ t: Date.now() - i * DAY, o: 100 + (400 - i) / 10, c: 100 });
    }
    const rows = computeTimeframes(candles, 150, "UTC", "crypto", Date.now());
    const y = rows.find((r) => r.label === "1Y")!;
    const ageDays = (Date.now() - Date.parse(y.anchorAt)) / DAY;
    expect(Math.abs(ageDays - 365)).toBeLessThanOrEqual(5);
  });
});
