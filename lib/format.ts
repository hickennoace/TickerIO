/**
 * Presentation-layer formatters.
 * NOTE: formatting only — never do period/finance math here. UTC → locale
 * conversion happens at render time, per CLAUDE.md §1.2.5.
 */

export function formatPrice(value: number, currency = "USD"): string {
  const fractionDigits = value >= 1000 ? 2 : value >= 1 ? 2 : 4;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    // Some Yahoo symbols report non-ISO units (e.g. "USX" cents for grain
    // futures). Intl rejects those — fall back to a plain number + the raw code.
    const n = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
    return `${n} ${currency}`;
  }
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatSignedPrice(value: number, currency = "USD"): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatPrice(Math.abs(value), currency)}`;
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export type Direction = "up" | "down" | "flat";

export function direction(value: number): Direction {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}
