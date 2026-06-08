"use client";

import { useState } from "react";
import { CalendarClock, ChevronDown, ExternalLink, Sparkles } from "lucide-react";
import type { NewsItem } from "@/lib/types";
import { useArticleSummary } from "@/lib/hooks";
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

/** The lazily-loaded "context behind this story" panel. */
function ArticleSummary({ symbol, item }: { symbol: string; item: NewsItem }) {
  const { data, isLoading, isError } = useArticleSummary(symbol, item, true);
  return (
    <div
      className="ml-5 mt-1 rounded-xl border p-3"
      style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <Sparkles size={12} style={{ color: "var(--accent)" }} />
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--fg-muted)" }}
        >
          The context behind this
        </span>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-3/4" />
        </div>
      ) : isError || !data || data.generatedBy === "unavailable" ? (
        <p className="text-[13px]" style={{ color: "var(--fg-dim)" }}>
          {data?.summary ?? "Couldn't summarize this story right now."}
        </p>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed text-[var(--fg)]">{data.summary}</p>
          <p className="mt-2 text-[10px]" style={{ color: "var(--fg-dim)" }}>
            Context summary · {data.generatedBy} · not financial advice
          </p>
        </>
      )}
    </div>
  );
}

function NewsRow({ symbol, item }: { symbol: string; item: NewsItem }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <div className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--panel-2)]">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: sourceTint(item.source) }}
        />
        <div className="min-w-0 flex-1">
          <a
            href={item.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm leading-snug text-[var(--fg)] group-hover:text-white"
          >
            {item.headline}
          </a>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: "var(--fg-dim)" }}>
            <span style={{ color: sourceTint(item.source) }}>{item.source}</span>
            <span>· {rel(item.publishedAt)}</span>
            <ExternalLink size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Hide summary" : "Summarize this story"}
          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-colors hover:bg-[var(--panel)]"
          style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
        >
          <ChevronDown
            size={15}
            className="transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          />
        </button>
      </div>
      {open && <ArticleSummary symbol={symbol} item={item} />}
    </li>
  );
}

function EventRow({ item }: { item: NewsItem }) {
  return (
    <li>
      <a
        href={item.url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--panel-2)]"
      >
        <CalendarClock size={15} className="mt-0.5 shrink-0" style={{ color: impactColor(item.impact) }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-[var(--fg)] group-hover:text-white">
            <span
              className="mr-1.5 rounded px-1 py-0.5 text-[10px] font-semibold uppercase"
              style={{ color: impactColor(item.impact), background: "var(--panel-2)" }}
            >
              Event
            </span>
            {item.headline}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--fg-dim)" }}>
            <span style={{ color: sourceTint(item.source) }}>{item.source}</span>
            <span> · {rel(item.publishedAt)}</span>
          </p>
        </div>
      </a>
    </li>
  );
}

export function NewsFeed({
  symbol,
  items,
  sources,
  loading,
}: {
  symbol: string;
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
          {items.map((item) =>
            item.kind === "event" ? (
              <EventRow key={item.id} item={item} />
            ) : (
              <NewsRow key={item.id} symbol={symbol} item={item} />
            ),
          )}
        </ul>
      )}

      <p className="mt-3 text-[11px]" style={{ color: "var(--fg-dim)" }}>
        Tap the ⌄ on any headline to summarize the story behind it.
      </p>
    </WidgetCard>
  );
}
