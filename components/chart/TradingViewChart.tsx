"use client";

import { useEffect, useId, useRef } from "react";
import type { AssetClass } from "@/lib/types";

/* Minimal typing for the injected global. */
declare global {
  interface Window {
    TradingView?: { widget: new (config: Record<string, unknown>) => unknown };
  }
}

const SCRIPT_SRC = "https://s3.tradingview.com/tv.js";

const INDEX_MAP: Record<string, string> = {
  "^GSPC": "SPX",
  "^IXIC": "IXIC",
  "^DJI": "DJI",
  "^NDX": "NDX",
  "^RUT": "RUT",
  "^VIX": "VIX",
  "^FTSE": "UKX",
  "^GDAXI": "DAX",
  "^N225": "NI225",
};

/** Map our resolved symbol → a TradingView symbol. */
function tvSymbol(symbol: string, display: string, assetClass: AssetClass): string {
  if (assetClass === "crypto") return `${display}USD`;
  if (assetClass === "forex") return `FX:${display.replace("/", "")}`;
  if (assetClass === "index") return INDEX_MAP[symbol] ?? symbol.replace("^", "");
  return symbol; // equity ticker resolves on TradingView
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window !== "undefined" && window.TradingView) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Failed to load TradingView"));
    document.head.appendChild(el);
  });
  return scriptPromise;
}

export function TradingViewChart({
  symbol,
  display,
  assetClass,
  interval = "D",
}: {
  symbol: string;
  display: string;
  assetClass: AssetClass;
  interval?: string;
}) {
  const rawId = useId().replace(/[:]/g, "_");
  const containerId = `tv_${rawId}`;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !window.TradingView || !ref.current) return;
        ref.current.innerHTML = "";
        new window.TradingView.widget({
          container_id: containerId,
          symbol: tvSymbol(symbol, display, assetClass),
          interval,
          autosize: true,
          theme: "dark",
          style: "1",
          locale: "en",
          timezone: "Etc/UTC",
          toolbar_bg: "#0e131f",
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          withdateranges: true,
          studies: ["Volume@tv-basicstudies"],
        });
      })
      .catch(() => {
        if (ref.current) {
          ref.current.innerHTML =
            '<div style="display:grid;place-items:center;height:100%;color:#586079;font-size:13px">Chart unavailable — TradingView could not load.</div>';
        }
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, display, assetClass, interval, containerId]);

  return <div id={containerId} ref={ref} className="h-full w-full" />;
}
