"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PriceAlert {
  id: string;
  symbol: string;
  op: "above" | "below";
  price: number;
  createdAt: number;
}

interface AlertsState {
  alerts: PriceAlert[];
  add: (symbol: string, op: PriceAlert["op"], price: number) => void;
  remove: (id: string) => void;
  forSymbol: (symbol: string) => PriceAlert[];
}

export const useAlerts = create<AlertsState>()(
  persist(
    (set, get) => ({
      alerts: [],
      add: (symbol, op, price) =>
        set((s) => ({
          alerts: [
            { id: `${symbol}-${Date.now()}`, symbol: symbol.toUpperCase(), op, price, createdAt: Date.now() },
            ...s.alerts,
          ].slice(0, 50),
        })),
      remove: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
      forSymbol: (symbol) => get().alerts.filter((a) => a.symbol === symbol.toUpperCase()),
    }),
    { name: "tickerio-alerts" },
  ),
);
