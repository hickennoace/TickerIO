"use client";

import { create } from "zustand";

/**
 * Shared market-bias signal so the global background can tint itself
 * (green bullish / red bearish / blue neutral) based on the active symbol.
 */
interface BiasState {
  bias: number; // -100..100
  setBias: (bias: number) => void;
}

export const useBias = create<BiasState>((set) => ({
  bias: 0,
  setBias: (bias) => set({ bias }),
}));
