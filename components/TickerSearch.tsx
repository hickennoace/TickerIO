"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

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

  function go(symbol: string) {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;
    router.push(`/${encodeURIComponent(clean)}`);
  }

  const big = size === "lg";

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="group relative w-full"
      >
        <Search
          size={big ? 22 : 18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: "var(--fg-dim)" }}
        />
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search a ticker — AAPL, BTC, ETH…"
          spellCheck={false}
          autoCapitalize="characters"
          className={`w-full rounded-2xl border bg-[var(--panel)] font-medium text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-dim)] focus:border-[var(--accent)] ${
            big ? "py-4 pl-12 pr-28 text-lg" : "py-2.5 pl-11 pr-20 text-sm"
          }`}
          style={{ boxShadow: "0 0 0 0 var(--accent-glow)" }}
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

      {big && (
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
