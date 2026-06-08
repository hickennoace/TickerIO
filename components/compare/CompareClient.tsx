"use client";

import { useQueries } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import Link from "next/link";
import { fetchCandles, fetchQuote, fetchTimeframes } from "@/lib/api";
import { formatPrice, formatPercent, direction } from "@/lib/format";
import { CompareChart, type CompareSeries } from "./CompareChart";
import { Skeleton } from "@/components/ui/Skeleton";

const PALETTE = ["#4f8cff", "#16c784", "#f0b90b", "#ea3943", "#7c5cff", "#22d3ee"];
const DEFAULTS = ["AAPL", "MSFT", "NVDA"];
const MAX = 6;

function parseSymbols(raw: string | null): string[] {
  if (!raw) return DEFAULTS;
  const list = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return list.length ? list.slice(0, MAX) : DEFAULTS;
}

export function CompareClient() {
  const router = useRouter();
  const params = useSearchParams();
  const symbols = useMemo(() => parseSymbols(params.get("symbols")), [params]);
  const [input, setInput] = useState("");

  function setSymbols(next: string[]) {
    const unique = Array.from(new Set(next)).slice(0, MAX);
    router.replace(unique.length ? `/compare?symbols=${unique.join(",")}` : "/compare");
  }

  const quoteResults = useQueries({
    queries: symbols.map((s) => ({ queryKey: ["quote", s], queryFn: () => fetchQuote(s), refetchInterval: 30_000 })),
  });
  const tfResults = useQueries({
    queries: symbols.map((s) => ({ queryKey: ["timeframes", s], queryFn: () => fetchTimeframes(s) })),
  });
  const candleResults = useQueries({
    queries: symbols.map((s) => ({
      queryKey: ["candles", s, "1y", "1d"],
      queryFn: () => fetchCandles(s, "1y", "1d"),
    })),
  });

  const series: CompareSeries[] = symbols
    .map((s, i) => ({
      symbol: s,
      color: PALETTE[i % PALETTE.length],
      closes: candleResults[i].data?.candles.map((c) => c.c) ?? [],
    }))
    .filter((x) => x.closes.length > 1);

  const tfPct = (i: number, label: string) =>
    tfResults[i].data?.rows.find((r) => r.label === label)?.changePct;

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compare</h1>
          <p className="text-sm text-[var(--fg-muted)]">Normalized performance, rebased to the period start.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = input.trim().toUpperCase();
            if (v) setSymbols([...symbols, v]);
            setInput("");
          }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Plus size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--fg-dim)" }} />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add symbol"
              spellCheck={false}
              disabled={symbols.length >= MAX}
              className="w-40 rounded-lg border bg-[var(--panel)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
          </div>
        </form>
      </div>

      {/* Active symbol chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {symbols.map((s, i) => (
          <span
            key={s}
            className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm font-semibold"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            {s}
            <button onClick={() => setSymbols(symbols.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
              <X size={14} style={{ color: "var(--fg-dim)" }} />
            </button>
          </span>
        ))}
      </div>

      {/* Overlay chart */}
      <section className="panel p-5">
        {candleResults.some((r) => r.isLoading) && series.length === 0 ? (
          <Skeleton className="h-[320px] w-full" />
        ) : (
          <CompareChart series={series} />
        )}
      </section>

      {/* Comparison table */}
      <section className="panel mt-5 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left" style={{ color: "var(--fg-muted)" }}>
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Day</th>
                <th className="px-4 py-3 text-right font-medium">Week</th>
                <th className="px-4 py-3 text-right font-medium">Month</th>
                <th className="px-4 py-3 text-right font-medium">YTD</th>
              </tr>
            </thead>
            <tbody>
              {symbols.map((s, i) => {
                const q = quoteResults[i].data;
                const cells: [string, number | undefined][] = [
                  ["Day", tfPct(i, "Day")],
                  ["Week", tfPct(i, "Week")],
                  ["Month", tfPct(i, "Month")],
                  ["YTD", tfPct(i, "YTD")],
                ];
                return (
                  <tr key={s} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/${encodeURIComponent(s)}`} className="flex items-center gap-2 font-semibold hover:text-white">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                        {q?.display ?? s}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num">
                      {q ? formatPrice(q.price, q.currency) : <Skeleton className="ml-auto h-4 w-16" />}
                    </td>
                    {cells.map(([label, v]) => (
                      <td key={label} className="px-4 py-3 text-right font-mono-num">
                        {v == null ? (
                          <Skeleton className="ml-auto h-4 w-12" />
                        ) : (
                          <span
                            style={{
                              color:
                                direction(v) === "up" ? "var(--up)" : direction(v) === "down" ? "var(--down)" : "var(--fg-muted)",
                            }}
                          >
                            {formatPercent(v)}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-center text-xs" style={{ color: "var(--fg-dim)" }}>
        Overlay rebased to each series&apos; first close over ~1Y · Yahoo Finance · not financial advice.
      </p>
    </main>
  );
}
