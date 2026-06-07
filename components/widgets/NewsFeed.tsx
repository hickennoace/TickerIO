import type { NewsItem } from "@/lib/demo";
import { WidgetCard } from "./WidgetCard";
import { DemoBadge } from "@/components/ui/DemoBadge";

function dot(sentiment: NewsItem["sentiment"]): string {
  return sentiment === "up" ? "var(--up)" : sentiment === "down" ? "var(--down)" : "var(--fg-dim)";
}

function ago(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  const h = Math.floor(minutes / 60);
  return `${h}h ago`;
}

export function NewsFeed({ news }: { news: NewsItem[] }) {
  return (
    <WidgetCard title="Latest News" action={<DemoBadge />}>
      <ul className="space-y-3">
        {news.map((item) => (
          <li
            key={item.id}
            className="group flex cursor-default gap-3 rounded-lg p-1 transition-colors hover:bg-[var(--panel-2)]"
          >
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ background: dot(item.sentiment) }}
            />
            <div className="min-w-0">
              <p className="text-sm leading-snug text-[var(--fg)]">{item.headline}</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--fg-dim)" }}>
                {item.source} · {ago(item.minutesAgo)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
