"use client";

import { useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchQuote } from "@/lib/api";
import { useAlerts } from "@/store/useAlerts";

function notify(symbol: string, op: string, target: number, price: number) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(`${symbol} is ${op} ${target}`, {
      body: `Now ${price}. Price alert triggered on TickerIO.`,
      icon: "/icon",
    });
  }
}

/**
 * Watches active price alerts (mounted globally). Polls quotes for the distinct
 * alert symbols and fires a browser notification the moment a threshold is
 * crossed, then clears that one-shot alert. Fires while TickerIO is open.
 */
export function AlertWatcher() {
  const alerts = useAlerts((s) => s.alerts);
  const remove = useAlerts((s) => s.remove);
  const symbols = Array.from(new Set(alerts.map((a) => a.symbol)));

  const results = useQueries({
    queries: symbols.map((s) => ({
      queryKey: ["quote", s],
      queryFn: () => fetchQuote(s),
      refetchInterval: 20_000,
      enabled: symbols.length > 0,
    })),
  });

  const pricesKey = results.map((r) => r.data?.price ?? "").join(",");

  useEffect(() => {
    const priceBy = new Map<string, number>();
    symbols.forEach((s, i) => {
      const d = results[i]?.data;
      if (d) priceBy.set(s, d.price);
    });
    for (const a of alerts) {
      const p = priceBy.get(a.symbol);
      if (p == null) continue;
      const hit = (a.op === "above" && p >= a.price) || (a.op === "below" && p <= a.price);
      if (hit) {
        notify(a.symbol, a.op, a.price, p);
        remove(a.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricesKey]);

  return null;
}
