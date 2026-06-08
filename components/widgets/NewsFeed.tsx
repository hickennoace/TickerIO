"use client";

import { CalendarClock, ExternalLink } from "lucide-react";
import type { NewsItem } from "@/lib/types";
import { WidgetCard } from "./WidgetCard";
import { Skeleton } from "@/components/ui/Skeleton";

/** Relative time that handles both past articles and future events. */
function rel(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const future = diff > 0;
  const m = Math.round(Math.abs(diff) / 60000);
  const fmt =
    m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
  return future ? `in ${fmt}` : `${fmt} ago`;
}

function impactColor(impact?: NewsItem["impact"]): string {
  return impact === "High" ? "var(--down)" : impact === "Medium" ? "var(--warn)" : "var(--accent)";
}

function sourceTint(source: string): string {
  if (source === "CoinDesk") return "#f7931a";
  if (source === "Forex Factory") return "var(--warn)";
  if (source === "FXStreet") return "#e0457b";
  return "var(--accent)";
}

export function NewsFeed({
  items,
  sources,
  loading,
}: {
  items?: NewsItem[];
  sources?: string[];
  loading: boolean;
}) {
  return (
    <WidgetCard
      title="Latest News"
      action={
        sources && sources.length ? (
          <span className="text-[11px]" style={{ color: "var(--fg-dim)" }}>
            {sources.join(" · ")}
          </span>
        ) : null
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--fg-dim)" }}>
          No recent headlines for this symbol.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const isEvent = item.kind === "event";
            return (
              <li key={item.id}>
                <a
                  href={item.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--panel-2)]"
                >
                  {isEvent ? (
                    <CalendarClock size={15} className="mt-0.5 shrink-0" style={{ color: impactColor(item.impact) }} />
                  ) : (
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: sourceTint(item.source) }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-[var(--fg)] group-hover:text-white">
                      {isEvent && (
                        <span
                          className="mr-1.5 rounded px-1 py-0.5 text-[10px] font-semibold uppercase"
                          style={{ color: impactColor(item.impact), background: "var(--panel-2)" }}
                        >
                          Event
                        </span>
                      )}
                      {item.headline}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: "var(--fg-dim)" }}>
                      <span style={{ color: sourceTint(item.source) }}>{item.source}</span>
                      <span>· {rel(item.publishedAt)}</span>
                      {!isEvent && <ExternalLink size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />}
                    </p>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
