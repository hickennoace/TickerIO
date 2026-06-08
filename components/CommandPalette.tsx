"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Search, Star, CornerDownLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearch } from "@/lib/hooks";
import { useWatchlist } from "@/store/useWatchlist";
import { useRecents } from "@/store/useRecents";
import type { SearchHit } from "@/lib/api";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const watchSymbols = useWatchlist((s) => s.symbols);
  const recents = useRecents((s) => s.recents);
  const pushRecent = useRecents((s) => s.push);
  const { data } = useSearch(query);

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const hits: SearchHit[] = data?.hits ?? [];
  const isEmpty = query.trim().length === 0;

  type Row = { symbol: string; label: string; sub?: string; section?: string };
  let rows: Row[];
  if (isEmpty) {
    const recentRows: Row[] = recents.map((s) => ({ symbol: s, label: s, section: "Recent" }));
    const watchRows: Row[] = watchSymbols
      .filter((s) => !recents.includes(s))
      .map((s) => ({ symbol: s, label: s, section: "Watchlist" }));
    rows = [...recentRows, ...watchRows];
  } else {
    rows = hits.map((h) => ({ symbol: h.symbol, label: h.symbol, sub: h.name }));
  }

  function go(symbol: string) {
    setOpen(false);
    const clean = symbol.toUpperCase();
    pushRecent(clean);
    router.push(`/${encodeURIComponent(clean)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (rows.length ? (a + 1) % rows.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (rows.length ? (a - 1 + rows.length) % rows.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = rows[active]?.symbol ?? query;
      if (pick) go(pick);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(2,4,8,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="panel relative z-10 w-full max-w-xl overflow-hidden p-0"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
              <Search size={18} style={{ color: "var(--fg-dim)" }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Jump to any ticker — AAPL, BTC, EURUSD…"
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-transparent py-4 text-base outline-none placeholder:text-[var(--fg-dim)]"
              />
              <kbd className="rounded border px-1.5 py-0.5 text-[10px] text-[var(--fg-dim)]" style={{ borderColor: "var(--border-strong)" }}>
                ESC
              </kbd>
            </div>

            <ul className="max-h-[50vh] overflow-y-auto p-1.5">
              {rows.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm" style={{ color: "var(--fg-dim)" }}>
                  {query ? "No matches — press Enter to try anyway." : "Type to search markets."}
                </li>
              ) : (
                rows.map((r, i) => {
                  const showHeader = r.section && rows[i - 1]?.section !== r.section;
                  return (
                    <li key={`${r.symbol}-${i}`}>
                      {showHeader && (
                        <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--fg-dim)" }}>
                          {r.section}
                        </div>
                      )}
                      <button
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(r.symbol)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left"
                        style={{ background: i === active ? "var(--panel-2)" : "transparent" }}
                      >
                        {r.section === "Watchlist" ? (
                          <Star size={15} style={{ color: "var(--warn)" }} fill="var(--warn)" />
                        ) : (
                          <Search size={15} style={{ color: "var(--fg-dim)" }} />
                        )}
                        <span className="font-semibold">{r.label}</span>
                        {r.sub && (
                          <span className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--fg-muted)" }}>
                            {r.sub}
                          </span>
                        )}
                        {i === active && (
                          <CornerDownLeft size={14} className="ml-auto" style={{ color: "var(--fg-dim)" }} />
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
