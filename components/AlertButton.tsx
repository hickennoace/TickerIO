"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAlerts } from "@/store/useAlerts";
import { formatPrice } from "@/lib/format";

export function AlertButton({
  symbol,
  price,
  currency = "USD",
}: {
  symbol: string;
  price: number;
  currency?: string;
}) {
  const add = useAlerts((s) => s.add);
  const remove = useAlerts((s) => s.remove);
  const all = useAlerts((s) => s.alerts);
  const [open, setOpen] = useState(false);
  const [op, setOp] = useState<"above" | "below">("above");
  const [value, setValue] = useState("");
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open && !value) setValue(price ? String(+price.toFixed(price >= 1 ? 2 : 4)) : "");
  }, [open, price, value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const mine = mounted ? all.filter((a) => a.symbol === symbol.toUpperCase()) : [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(value);
    if (!isFinite(num) || num <= 0) return;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    add(symbol, op, num);
    setValue("");
    setOp(num >= price ? "above" : "below");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-lg border transition-colors hover:border-[var(--border-strong)]"
        style={{ borderColor: "var(--border)" }}
        title="Price alerts"
        aria-label="Price alerts"
      >
        <Bell size={17} style={{ color: mine.length ? "var(--accent)" : "var(--fg-dim)" }} fill={mine.length ? "var(--accent)" : "none"} />
        {mine.length > 0 && (
          <span
            className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            {mine.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="panel absolute right-0 z-50 mt-2 w-64 p-3"
          style={{ boxShadow: "0 24px 48px -20px rgba(0,0,0,0.9)" }}
        >
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--fg-muted)" }}>
            Alert me when {symbol} is
          </div>
          <form onSubmit={submit} className="space-y-2">
            <div className="flex gap-1 rounded-lg border p-1" style={{ borderColor: "var(--border)" }}>
              {(["above", "below"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOp(o)}
                  className="flex-1 rounded-md py-1 text-xs font-semibold capitalize transition-colors"
                  style={op === o ? { background: "var(--panel-2)", color: "var(--fg)" } : { color: "var(--fg-dim)" }}
                >
                  {o}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
                placeholder="Price"
                className="w-full rounded-lg border bg-[var(--panel-2)] px-2.5 py-1.5 font-mono-num text-sm outline-none focus:border-[var(--accent)]"
              />
              <button type="submit" className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">
                Set
              </button>
            </div>
          </form>

          {mine.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-[var(--border)] pt-2">
              {mine.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--fg-muted)" }}>
                    {a.op} <span className="font-mono-num text-[var(--fg)]">{formatPrice(a.price, currency)}</span>
                  </span>
                  <button onClick={() => remove(a.id)} aria-label="Remove alert">
                    <X size={13} style={{ color: "var(--fg-dim)" }} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px]" style={{ color: "var(--fg-dim)" }}>
            Notifies while TickerIO is open.
          </p>
        </div>
      )}
    </div>
  );
}
