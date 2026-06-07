import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { getEconomicCalendar } from "@/lib/providers/calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { value } = await cached("calendar:thisweek", 3600, getEconomicCalendar);
    return NextResponse.json({ events: value, source: "Forex Factory", asOf: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg, events: [] }, { status: 200 });
  }
}
