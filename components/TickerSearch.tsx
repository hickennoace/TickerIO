"use client";

import { useRouter } from "next/navigation";
import { Search, TrendingUp } from "lucide-react";
import { useRef, useState } from "react";
import { useSearch } from "@/lib/hooks";
import type { SearchHit } from "@/lib/api";

const SUGGESTIONS = ["AAPL", "NVDA", "TSLA", "BTC", "ETH", "SOL"];

export function TickerSearch({
  size = "lg",
  autoFocus = false,
}: {
  size?: "lg" | "sm";
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data } = useSearch(value);
  const hits: SearchHit[] = value.trim().length >= 1 ? data?.hits ?? [] : [];
  const big = size === "lg";

  function go(symbol: string) {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;
    setOpen(false);
    setValue("");
    router.push(`/${encodeURIComponent(clean)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || hits.length === 0) {
      if (e.key === "Enter") go(value);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[active]?.symbol ?? value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(hits[active]?.symbol ?? value);
        }}
        className="relative w-full"
      >
        <Search
          size={big ? 22 : 18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: "var(--fg-dim)" }}
        />
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search a ticker — AAPL, BTC, ETH…"
          spellCheck={false}
          autoComplete="off"
          className={`w-full rounded-2xl border bg-[var(--panel)] font-medium text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-dim)] focus:border-[var(--accent)] ${
            big ? "py-4 pl-12 pr-28 text-lg" : "py-2.5 pl-11 pr-20 text-sm"
          }`}
        />
        <button
          type="submit"
          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-[var(--accent)] font-semibold text-white transition-opacity hover:opacity-90 ${
            big ? "px-5 py-2.5 text-sm" : "px-3 py-1.5 text-xs"
          }`}
        >
          Analyze
        </button>
      </form>

      {/* Autocomplete dropdown */}
      {open && hits.length > 0 && (
        <ul
          className="panel absolute z-50 mt-2 w-full overflow-hidden p-1.5"
          onMouseDown={(e) => e.preventDefault()}
        >
          {hits.map((hit, i) => (
            <li key={`${hit.symbol}-${i}`}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(hit.symbol)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
                style={{ background: i === active ? "var(--panel-2)" : "transparent" }}
              >
                <TrendingUp size={15} style={{ color: "var(--accent)" }} />
                <span className="font-semibold">{hit.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--fg-muted)" }}>
                  {hit.name}
                </span>
                <span className="shrink-0 text-xs" style={{ color: "var(--fg-dim)" }}>
                  {hit.type}
                  {hit.exchange ? ` · ${hit.exchange}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {big && !open && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs" style={{ color: "var(--fg-dim)" }}>
            Try
          </span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => go(s)}
              className="rounded-lg border px-2.5 py-1 text-xs font-semibold text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
