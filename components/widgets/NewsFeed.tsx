"use client";

import { CalendarClock, ExternalLink, Sparkles } from "lucide-react";
import type { NewsItem } from "@/lib/types";
import type { NewsDigest } from "@/lib/api";
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

function leanColor(lean?: NewsDigest["lean"]): string {
  return lean === "positive" ? "var(--up)" : lean === "negative" ? "var(--down)" : "var(--warn)";
}

export function NewsFeed({
  items,
  sources,
  digest,
  loading,
}: {
  items?: NewsItem[];
  sources?: string[];
  digest?: NewsDigest | null;
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

      {/* Plain-language AI digest of the headlines */}
      {!loading && digest && (
        <div
          className="mt-4 rounded-xl border p-3"
          style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.015)" }}
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            <Sparkles size={13} style={{ color: leanColor(digest.lean) }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--fg-muted)" }}>
              What this means
            </span>
            <span
              className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize"
              style={{ color: leanColor(digest.lean), background: "var(--panel-2)" }}
            >
              {digest.lean}
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--fg)]">{digest.text}</p>
          <p className="mt-2 text-[10px]" style={{ color: "var(--fg-dim)" }}>
            Plain-language summary · {digest.generatedBy} · not financial advice
          </p>
        </div>
      )}
    </WidgetCard>
  );
}
