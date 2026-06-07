/**
 * Calendar/session helpers for anchored timeframe math (CLAUDE.md §4).
 *
 * All bucketing happens in a *reference timezone* (UTC for 24/7 crypto/forex,
 * the exchange tz for equities). We convert each candle timestamp into that
 * zone, then ask "which week/month/quarter/year does it belong to?" — DST-safe
 * via date-fns-tz.
 */

import { toZonedTime } from "date-fns-tz";

/** A timezone-zoned breakdown of a UTC instant. */
export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  /** ISO weekday 1 (Mon) … 7 (Sun). */
  weekday: number;
  /** Quarter 1-4. */
  quarter: number;
  /** YYYY-MM-DD key in the reference zone. */
  dayKey: string;
  /** ISO week key, e.g. "2026-W23", in the reference zone. */
  weekKey: string;
}

export function zonedParts(epochMs: number, tz: string): ZonedParts {
  const d = toZonedTime(new Date(epochMs), tz);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const jsDow = d.getDay(); // 0 (Sun) … 6 (Sat)
  const weekday = jsDow === 0 ? 7 : jsDow;
  const quarter = Math.floor((month - 1) / 3) + 1;
  const dayKey = `${year}-${pad(month)}-${pad(day)}`;
  const { isoYear, isoWeek } = isoWeekParts(d);
  return {
    year,
    month,
    day,
    weekday,
    quarter,
    dayKey,
    weekKey: `${isoYear}-W${pad(isoWeek)}`,
  };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** ISO-8601 week number (Mon-based) of a local Date. */
function isoWeekParts(d: Date): { isoYear: number; isoWeek: number } {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNr = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  date.setDate(date.getDate() - dayNr + 3); // nearest Thursday
  const isoYear = date.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  const isoWeek = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return { isoYear, isoWeek };
}
