"use client";

import { ExternalLink } from "lucide-react";
import type { NewsItem } from "@/lib/types";
import { WidgetCard } from "./WidgetCard";
import { Skeleton } from "@/components/ui/Skeleton";

function ago(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NewsFeed({ items, source, loading }: { items?: NewsItem[]; source?: string; loading: boolean }) {
  return (
    <WidgetCard
      title="Latest News"
      action={source ? <span className="text-[11px]" style={{ color: "var(--fg-dim)" }}>{source}</span> : null}
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
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--panel-2)]"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-[var(--fg)] group-hover:text-white">
                    {item.headline}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: "var(--fg-dim)" }}>
                    {item.source} · {ago(item.publishedAt)}
                    <ExternalLink size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
