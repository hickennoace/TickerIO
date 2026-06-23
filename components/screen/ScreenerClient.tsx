"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { useScreener } from "@/lib/hooks";
import type { ScreenerRow } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

type Key = keyof Omit<ScreenerRow, "symbol">;

const COLS: { key: Key; label: string; pct?: boolean; ratio?: boolean }[] = [
  { key: "composite", label: "ציון כולל" },
  { key: "profitability", label: "רווחיות" },
  { key: "valuation", label: "שווי" },
  { key: "cashFlow", label: "תזרים" },
  { key: "pe", label: "P/E", ratio: true },
  { key: "netMarginPct", label: "מרווח", pct: true },
  { key: "revenueGrowthPct", label: "צמיחה", pct: true },
  { key: "dividendYieldPct", label: "דיבידנד", pct: true },
];

function scoreColor(s: number | null): string {
  if (s == null) return "var(--fg-dim)";
  if (s >= 65) return "var(--up)";
  if (s >= 50) return "var(--warn)";
  return "var(--down)";
}

export function ScreenerClient() {
  const { data, isLoading } = useScreener();
  const [sortKey, setSortKey] = useState<Key>("composite");
  const [minComposite, setMinComposite] = useState(0);

  const rows = useMemo(() => {
    const r = (data?.rows ?? []).filter((x) => (x.composite ?? 0) >= minComposite);
    return [...r].sort((a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity));
  }, [data, sortKey, minComposite]);

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">סקרינר פונדמנטלי</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>
        דירוג מניות מובילות לפי מנוע הניתוח — מיין לפי כל עמודה או סנן לפי ציון כולל מינימלי.
      </p>

      <div className="mt-5 flex items-center gap-3">
        <label className="text-sm" style={{ color: "var(--fg-muted)" }}>ציון כולל מינימלי</label>
        <input
          type="range" min={0} max={90} step={5} value={minComposite}
          onChange={(e) => setMinComposite(Number(e.target.value))}
          className="w-48 accent-[var(--accent)]"
        />
        <span className="font-mono-num text-sm font-semibold" style={{ color: "var(--fg)" }}>{minComposite}</span>
        <span className="text-sm" style={{ color: "var(--fg-dim)" }}>· {rows.length} ניירות</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)]">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px]" style={{ color: "var(--fg-muted)", background: "var(--panel-2)" }}>
                <th className="px-3 py-2.5 text-start font-medium">נייר</th>
                {COLS.map((c) => (
                  <th key={c.key} className="px-3 py-2.5 font-medium">
                    <button
                      onClick={() => setSortKey(c.key)}
                      className="mx-auto inline-flex items-center gap-1 transition-colors hover:text-[var(--fg)]"
                      style={{ color: sortKey === c.key ? "var(--accent)" : "inherit" }}
                    >
                      {c.label}
                      <ArrowUpDown size={11} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol} className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--panel-2)]">
                  <td className="px-3 py-2.5">
                    <Link href={`/${encodeURIComponent(r.symbol)}`} className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>
                      {r.symbol}
                    </Link>
                  </td>
                  {COLS.map((c) => {
                    const v = r[c.key];
                    const isScore = ["composite", "profitability", "valuation", "cashFlow"].includes(c.key);
                    const tone = isScore
                      ? scoreColor(v)
                      : c.pct && v != null && c.key !== "dividendYieldPct"
                        ? (v as number) >= 0 ? "var(--up)" : "var(--down)"
                        : "var(--fg)";
                    const text = v == null ? "—" : c.pct ? `${(v as number) > 0 && c.key !== "dividendYieldPct" ? "+" : ""}${v}%` : `${v}`;
                    return (
                      <td key={c.key} className="px-3 py-2.5 text-center">
                        <span className="font-mono-num ltr-num text-sm" style={{ color: tone, fontWeight: isScore ? 600 : 400 }}>{text}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4 text-center text-xs" style={{ color: "var(--fg-dim)" }}>
        מבוסס נתוני Yahoo Finance · ניתוח, לא ייעוץ השקעות.
      </p>
    </main>
  );
}
