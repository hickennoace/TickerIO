"use client";

import type { QuoteResponse } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { UI } from "@/lib/i18n/he";
import { WidgetCard } from "./WidgetCard";
import { Skeleton } from "@/components/ui/Skeleton";

/** Position of `value` within [lo, hi] as a 0..100 percentage. */
function pos(value: number, lo: number, hi: number): number {
  if (hi <= lo) return 50;
  return Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100));
}

function RangeBar({ lo, hi, value, currency }: { lo: number; hi: number; value: number; currency: string }) {
  const p = pos(value, lo, hi);
  return (
    <div dir="ltr">
      <div className="relative h-1.5 rounded-full" style={{ background: "var(--panel-2)" }}>
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ left: `${p}%`, background: "var(--fg)", borderColor: "var(--bg)" }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px]" style={{ color: "var(--fg-dim)" }}>
        <span className="font-mono-num">{formatPrice(lo, currency)}</span>
        <span className="font-mono-num">{formatPrice(hi, currency)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] py-2 last:border-0">
      <span className="text-sm" style={{ color: "var(--fg-muted)" }}>
        {label}
      </span>
      <span className="font-mono-num text-sm">{value}</span>
    </div>
  );
}

export function KeyStats({ quote, loading }: { quote?: QuoteResponse; loading: boolean }) {
  return (
    <WidgetCard title={UI.keyStatistics}>
      {loading || !quote ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <Row label={UI.previousClose} value={formatPrice(quote.previousClose, quote.currency)} />
            {quote.dayLow != null && quote.dayHigh != null && (
              <Row
                label={UI.dayRange}
                value={`${formatPrice(quote.dayLow, quote.currency)} – ${formatPrice(quote.dayHigh, quote.currency)}`}
              />
            )}
            <Row label={UI.exchange} value={quote.exchange || "—"} />
            <Row label={UI.currency} value={quote.currency} />
          </div>

          {quote.fiftyTwoWeekLow != null && quote.fiftyTwoWeekHigh != null && (
            <div className="mt-4">
              <p className="mb-2 text-xs" style={{ color: "var(--fg-muted)" }}>
                {UI.week52Range}
              </p>
              <RangeBar
                lo={quote.fiftyTwoWeekLow}
                hi={quote.fiftyTwoWeekHigh}
                value={quote.price}
                currency={quote.currency}
              />
            </div>
          )}
        </>
      )}
    </WidgetCard>
  );
}
