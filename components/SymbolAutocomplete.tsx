"use client";

import { Search, TrendingUp } from "lucide-react";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSearch } from "@/lib/hooks";
import { scaleIn } from "@/lib/motion";
import type { SearchHit } from "@/lib/api";

/**
 * Reusable symbol search box with a keyboard-navigable autocomplete dropdown
 * (Yahoo search). Unlike TickerSearch (which navigates), this is callback-based:
 * the parent decides what to do with the chosen symbol via `onSelect`.
 */
export function SymbolAutocomplete({
  onSelect,
  placeholder = "Add symbol — AAPL, BTC, GC=F…",
  disabled = false,
  autoFocus = false,
  clearOnSelect = true,
  className = "",
}: {
  onSelect: (symbol: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  clearOnSelect?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data } = useSearch(value);
  const hits: SearchHit[] = value.trim().length >= 1 ? data?.hits ?? [] : [];

  function choose(symbol: string) {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;
    onSelect(clean);
    setOpen(false);
    setActive(0);
    if (clearOnSelect) setValue("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || hits.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        choose(value);
      }
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
      choose(hits[active]?.symbol ?? value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: "var(--fg-dim)" }}
      />
      <input
        autoFocus={autoFocus}
        value={value}
        disabled={disabled}
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
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className="w-full rounded-lg border bg-[var(--panel)] py-2.5 pl-9 pr-3 text-sm font-medium text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-dim)] focus:border-[var(--accent)] disabled:opacity-50"
      />

      <AnimatePresence>
        {open && hits.length > 0 && (
          <motion.ul
            variants={scaleIn}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{ transformOrigin: "top" }}
            className="panel absolute z-50 mt-2 w-full min-w-[280px] overflow-hidden p-1.5"
            onMouseDown={(e) => e.preventDefault()}
          >
            {hits.map((hit, i) => (
              <li key={`${hit.symbol}-${i}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(hit.symbol)}
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
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
