"use client";

import Link from "next/link";
import { useQuote } from "@/lib/hooks";
import { formatPrice, formatPercent, direction } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";

export function MiniTicker({ symbol, label }: { symbol: string; label?: string }) {
  const { data, isLoading } = useQuote(symbol);

  if (isLoading && !data) {
    return (
      <div className="panel p-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="mt-2 h-5 w-24" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="panel p-3 opacity-60">
        <span className="text-sm font-semibold">{label ?? symbol}</span>
        <p className="mt-1 text-xs" style={{ color: "var(--fg-dim)" }}>
          unavailable
        </p>
      </div>
    );
  }

  const dir = direction(data.changePct);
  const color = dir === "up" ? "var(--up)" : dir === "down" ? "var(--down)" : "var(--fg-muted)";

  return (
    <Link href={`/${encodeURIComponent(data.symbol)}`} className="panel panel-hover block p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label ?? data.display}</span>
        <span className="font-mono-num text-xs font-semibold" style={{ color }}>
          {formatPercent(data.changePct)}
        </span>
      </div>
      <p className="mt-1 font-mono-num text-base">{formatPrice(data.price, data.currency)}</p>
    </Link>
  );
}
