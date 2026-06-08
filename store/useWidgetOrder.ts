"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Canonical right-rail widget ids, in default order. */
export const DEFAULT_ORDER = ["performance", "keystats", "feargreed", "trendbias", "calendar"] as const;
export type WidgetId = (typeof DEFAULT_ORDER)[number];

interface WidgetOrderState {
  order: string[];
  setOrder: (order: string[]) => void;
  reset: () => void;
}

export const useWidgetOrder = create<WidgetOrderState>()(
  persist(
    (set) => ({
      order: [...DEFAULT_ORDER],
      setOrder: (order) => set({ order }),
      reset: () => set({ order: [...DEFAULT_ORDER] }),
    }),
    { name: "tickerio-widget-order" },
  ),
);

/** Reconcile a stored order with the known widgets (drop unknown, append new). */
export function reconcileOrder(stored: string[]): string[] {
  const known = new Set<string>(DEFAULT_ORDER);
  const kept = stored.filter((id) => known.has(id));
  const missing = DEFAULT_ORDER.filter((id) => !kept.includes(id));
  return [...kept, ...missing];
}
