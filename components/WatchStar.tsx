"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useWatchlist } from "@/store/useWatchlist";

export function WatchStar({ symbol }: { symbol: string }) {
  const toggle = useWatchlist((s) => s.toggle);
  const symbols = useWatchlist((s) => s.symbols);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const active = mounted && symbols.includes(symbol);

  return (
    <button
      onClick={() => toggle(symbol)}
      className="grid h-9 w-9 place-items-center rounded-lg border transition-colors hover:border-[var(--border-strong)]"
      style={{ borderColor: "var(--border)" }}
      title={active ? "הסר מרשימת המעקב" : "הוסף לרשימת המעקב"}
      aria-pressed={active}
    >
      <Star
        size={18}
        style={{ color: active ? "var(--warn)" : "var(--fg-dim)" }}
        fill={active ? "var(--warn)" : "none"}
      />
    </button>
  );
}
