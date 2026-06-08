"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Star, X, Plus } from "lucide-react";
import { fetchQuote, fetchCandles } from "@/lib/api";
import { formatPrice, formatPercent, formatSignedPrice, direction } from "@/lib/format";
import { useWatchlist } from "@/store/useWatchlist";
import { Sparkline } from "@/components/widgets/Sparkline";
import { Skeleton } from "@/components/ui/Skeleton";
import { TickerSearch } from "@/components/TickerSearch";

const POPULAR = ["AAPL", "NVDA", "TSLA", "BTC", "ETH", "SOL", "EURUSD"];

export function WatchlistClient() {
  const symbols = useWatchlist((s) => s.symbols);
  const remove = useWatchlist((s) => s.remove);
  const add = useWatchlist((s) => s.add);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const quotes = useQueries({
    queries: symbols.map((s) => ({ queryKey: ["quote", s], queryFn: () => fetchQuote(s), refetchInterval: 30_000 })),
  });
  const candles = useQueries({
    queries: symbols.map((s) => ({ queryKey: ["candles", s, "1d", "5m"], queryFn: () => fetchCandles(s, "1d", "5m") })),
  });

  if (!mounted) {
    return (
      <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-40" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Star size={22} style={{ color: "var(--warn)" }} fill="var(--warn)" />
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Watchlist</h1>
        <span className="text-sm" style={{ color: "var(--fg-dim)" }}>
          {symbols.length} {symbols.length === 1 ? "symbol" : "symbols"} · live
        </span>
      </div>

      {symbols.length === 0 ? (
        <div className="panel p-10 text-center">
          <Star size={36} className="mx-auto mb-4" style={{ color: "var(--fg-dim)" }} />
          <h2 className="font-display text-xl font-bold">Your watchlist is empty</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--fg-muted)]">
            Search a ticker and tap the star to track it here. Quick add:
          </p>
          <div className="mx-auto mt-5 max-w-md">
            <TickerSearch size="lg" />
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {POPULAR.map((s) => (
              <button
                key={s}
                onClick={() => add(s)}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
              >
                <Plus size={12} /> {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {symbols.map((s, i) => {
            const q = quotes[i].data;
            const spark = candles[i].data?.candles.map((c) => c.c) ?? [];
            const dir = q ? direction(q.changePct) : "flat";
            const up = dir !== "down";
            const color = dir === "up" ? "var(--up)" : dir === "down" ? "var(--down)" : "var(--fg-muted)";

            return (
              <div key={s} className="panel panel-hover group relative p-5">
                <button
                  onClick={() => remove(s)}
                  className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-md opacity-0 transition-opacity hover:bg-[var(--panel-2)] group-hover:opacity-100"
                  aria-label={`Remove ${s}`}
                >
                  <X size={15} style={{ color: "var(--fg-dim)" }} />
                </button>

                <Link href={`/${encodeURIComponent(s)}`} className="block">
                  {!q ? (
                    <>
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="mt-3 h-8 w-28" />
                      <Skeleton className="mt-4 h-10 w-full" />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-display text-xl font-bold">{q.display}</div>
                          <div className="truncate text-xs" style={{ color: "var(--fg-dim)" }}>
                            {q.name}
                          </div>
                        </div>
                        <span
                          className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase"
                          style={{ color: "var(--fg-muted)", background: "var(--panel-2)" }}
                        >
                          {q.assetClass}
                        </span>
                      </div>

                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <div className="font-mono-num text-2xl font-semibold">
                            {formatPrice(q.price, q.currency)}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-sm" style={{ color }}>
                            <span className="font-semibold">{formatPercent(q.changePct)}</span>
                            <span className="font-mono-num text-xs">{formatSignedPrice(q.change, q.currency)}</span>
                          </div>
                        </div>
                        {spark.length > 1 && <Sparkline data={spark} up={up} width={120} height={44} />}
                      </div>
                    </>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
