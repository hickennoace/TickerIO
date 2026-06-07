"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { QuoteResponse } from "@/lib/api";
import { formatPrice, formatPercent, formatSignedPrice, direction } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { LivePulse } from "@/components/ui/LivePulse";
import { Skeleton } from "@/components/ui/Skeleton";
import { WatchStar } from "@/components/WatchStar";
import { Sparkline } from "./Sparkline";

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export function PriceHeader({
  quote,
  spark,
  loading,
  error,
}: {
  quote?: QuoteResponse;
  spark: number[];
  loading: boolean;
  error?: string | null;
}) {
  if (loading && !quote) {
    return (
      <section className="panel p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-3 h-4 w-56" />
        <Skeleton className="mt-5 h-12 w-64" />
      </section>
    );
  }

  if (error || !quote) {
    return (
      <section className="panel p-6">
        <h1 className="text-2xl font-bold">Couldn&apos;t load this symbol</h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          {error ?? "No data returned."} Try another ticker — e.g. AAPL, BTC, EURUSD.
        </p>
      </section>
    );
  }

  const dir = direction(quote.changePct);
  const up = dir !== "down";
  const color = up ? "var(--up)" : "var(--down)";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const currency = quote.currency || "USD";

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{quote.display}</h1>
            <span
              className="rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]"
              style={{ borderColor: "var(--border-strong)" }}
            >
              {quote.assetClass}
            </span>
            {quote.stale ? (
              <span className="text-xs font-semibold" style={{ color: "var(--warn)" }}>
                delayed
              </span>
            ) : (
              <LivePulse color={color} label="Live" />
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            {quote.name}
            {quote.exchange ? ` · ${quote.exchange}` : ""}
          </p>

          <div className="mt-4 flex items-end gap-3">
            <AnimatedNumber
              value={quote.price}
              format={(n) => formatPrice(n, currency)}
              className="font-mono-num text-4xl font-semibold leading-none"
            />
            <div className="flex items-center gap-2 pb-1" style={{ color }}>
              <span className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold tabular" style={{ background: up ? "var(--up-soft)" : "var(--down-soft)" }}>
                <Icon size={14} strokeWidth={2.5} />
                {formatPercent(quote.changePct)}
              </span>
              <span className="font-mono-num text-sm">{formatSignedPrice(quote.change, currency)}</span>
            </div>
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--fg-dim)" }}>
            vs prev close · {quote.source} · {relTime(quote.asOf)}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {spark.length > 1 ? (
            <Sparkline data={spark} up={up} width={260} height={64} />
          ) : (
            <Skeleton className="h-16 w-64" />
          )}
          <WatchStar symbol={quote.symbol} />
        </div>
      </div>
    </section>
  );
}
