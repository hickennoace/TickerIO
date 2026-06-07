"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WatchlistState {
  symbols: string[];
  add: (symbol: string) => void;
  remove: (symbol: string) => void;
  toggle: (symbol: string) => void;
  has: (symbol: string) => boolean;
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      symbols: [],
      add: (symbol) =>
        set((s) =>
          s.symbols.includes(symbol) ? s : { symbols: [symbol, ...s.symbols].slice(0, 24) },
        ),
      remove: (symbol) => set((s) => ({ symbols: s.symbols.filter((x) => x !== symbol) })),
      toggle: (symbol) =>
        set((s) =>
          s.symbols.includes(symbol)
            ? { symbols: s.symbols.filter((x) => x !== symbol) }
            : { symbols: [symbol, ...s.symbols].slice(0, 24) },
        ),
      has: (symbol) => get().symbols.includes(symbol),
    }),
    { name: "tickerio-watchlist" },
  ),
);
