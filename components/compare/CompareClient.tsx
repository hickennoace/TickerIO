"use client";

import { useQueries } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { SPRING } from "@/lib/motion";
import { fetchCandles, fetchQuote, fetchTimeframes } from "@/lib/api";
import { formatPrice, formatPercent, direction } from "@/lib/format";
import { SymbolAutocomplete } from "@/components/SymbolAutocomplete";
import { CompareChart, type CompareSeries } from "./CompareChart";
import { Skeleton } from "@/components/ui/Skeleton";

const PALETTE = ["#4f8cff", "#16c784", "#f0b90b", "#ea3943", "#7c5cff", "#22d3ee"];
const DEFAULTS = ["AAPL", "MSFT", "NVDA"];
const MAX = 6;

const PERIODS: { key: string; label: string; range: string }[] = [
  { key: "1M", label: "1M", range: "1mo" },
  { key: "3M", label: "3M", range: "3mo" },
  { key: "6M", label: "6M", range: "6mo" },
  { key: "YTD", label: "YTD", range: "ytd" },
  { key: "1Y", label: "1Y", range: "1y" },
];

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
  const [period, setPeriod] = useState("1Y");
  const range = PERIODS.find((p) => p.key === period)?.range ?? "1y";

  function setSymbols(next: string[]) {
    const unique = Array.from(new Set(next.map((s) => s.toUpperCase()))).slice(0, MAX);
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
      queryKey: ["candles", s, range, "1d"],
      queryFn: () => fetchCandles(s, range, "1d"),
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
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Compare</h1>
        <p className="text-sm text-[var(--fg-muted)]">Normalized performance, rebased to the period start.</p>
      </div>

      {/* Controls: add box (with autocomplete) + active chips */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SymbolAutocomplete
            onSelect={(s) => setSymbols([...symbols, s])}
            disabled={symbols.length >= MAX}
            placeholder={symbols.length >= MAX ? `Max ${MAX} symbols` : "Add symbol — AAPL, BTC, GC=F…"}
            className="w-full sm:w-72"
          />
          <span className="text-xs" style={{ color: "var(--fg-dim)" }}>
            {symbols.length}/{MAX} symbols
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <AnimatePresence mode="popLayout">
            {symbols.map((s, i) => (
              <motion.span
                key={s}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={SPRING.snappy}
                className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm font-semibold"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                {s}
                <button onClick={() => setSymbols(symbols.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
                  <X size={14} style={{ color: "var(--fg-dim)" }} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          {symbols.length === 0 && (
            <button
              onClick={() => setSymbols(DEFAULTS)}
              className="rounded-lg border px-2.5 py-1.5 text-sm font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
              style={{ borderColor: "var(--border)" }}
            >
              Load example set
            </button>
          )}
        </div>
      </div>

      {/* Overlay chart */}
      <section className="panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
            Normalized overlay
          </h2>
          <div className="inline-flex gap-1 rounded-lg border border-[var(--border)] p-0.5">
            {PERIODS.map((p) => {
              const on = p.key === period;
              return (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className="relative rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
                  style={{ color: on ? "#fff" : "var(--fg-muted)" }}
                >
                  {on && (
                    <motion.span
                      layoutId="compare-period-pill"
                      className="absolute inset-0 rounded-md"
                      style={{ background: "var(--accent)" }}
                      transition={SPRING.snappy}
                    />
                  )}
                  <span className="relative z-10">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
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
        Overlay rebased to each series&apos; first close over {period} · Yahoo Finance · not financial advice.
      </p>
    </main>
  );
}
