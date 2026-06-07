/**
 * Change calculators with explicit bases (CLAUDE.md §1.2.4, §4.1).
 * Pure functions — the reference base is always an argument, never implied.
 */

export function pctChange(current: number, base: number): number {
  if (!isFinite(base) || base === 0) return 0;
  return ((current - base) / base) * 100;
}

export function absChange(current: number, base: number): number {
  if (!isFinite(base)) return 0;
  return current - base;
}

export type Direction = "up" | "down" | "flat";

export function direction(value: number, epsilon = 1e-9): Direction {
  if (value > epsilon) return "up";
  if (value < -epsilon) return "down";
  return "flat";
}
