import { describe, it, expect } from "vitest";
import { pctChange, absChange, direction } from "./change";

describe("change calculators", () => {
  it("pctChange is explicit-base and safe on zero", () => {
    expect(pctChange(110, 100)).toBeCloseTo(10);
    expect(pctChange(90, 100)).toBeCloseTo(-10);
    expect(pctChange(100, 0)).toBe(0); // no divide-by-zero NaN
  });

  it("absChange returns the signed delta", () => {
    expect(absChange(110, 100)).toBe(10);
    expect(absChange(90, 100)).toBe(-10);
  });

  it("direction classifies with an epsilon", () => {
    expect(direction(0.5)).toBe("up");
    expect(direction(-0.5)).toBe("down");
    expect(direction(0)).toBe("flat");
  });
});
