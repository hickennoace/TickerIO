/**
 * Forex Factory weekly economic calendar via the public faireconomy JSON feed.
 * Drives the macro "event risk" rail — high-impact events move every market.
 */

import { z } from "zod";
import { fetchJson } from "@/lib/cache";
import type { CalendarEvent } from "@/lib/types";

const schema = z.array(
  z.object({
    title: z.string(),
    country: z.string(),
    date: z.string(),
    impact: z.string(),
    forecast: z.string().optional().default(""),
    previous: z.string().optional().default(""),
  }),
);

function normImpact(s: string): CalendarEvent["impact"] {
  const v = s.toLowerCase();
  if (v.includes("high")) return "High";
  if (v.includes("medium")) return "Medium";
  if (v.includes("holiday")) return "Holiday";
  return "Low";
}

export async function getEconomicCalendar(): Promise<CalendarEvent[]> {
  const raw = await fetchJson<unknown>(
    "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  );
  const parsed = schema.parse(raw);
  return parsed
    .map((e) => ({
      title: e.title,
      country: e.country,
      impact: normImpact(e.impact),
      date: e.date,
      forecast: e.forecast,
      previous: e.previous,
    }))
    .filter((e) => e.impact === "High" || e.impact === "Medium");
}
