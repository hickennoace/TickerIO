"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecentsState {
  recents: string[];
  push: (symbol: string) => void;
  clear: () => void;
}

export const useRecents = create<RecentsState>()(
  persist(
    (set) => ({
      recents: [],
      push: (symbol) =>
        set((s) => ({
          recents: [symbol, ...s.recents.filter((x) => x !== symbol)].slice(0, 8),
        })),
      clear: () => set({ recents: [] }),
    }),
    { name: "tickerio-recents" },
  ),
);
