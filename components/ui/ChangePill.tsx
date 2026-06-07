import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { direction, formatPercent } from "@/lib/format";

export function ChangePill({
  value,
  size = "md",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  const dir = direction(value);
  const color =
    dir === "up" ? "var(--up)" : dir === "down" ? "var(--down)" : "var(--fg-muted)";
  const bg =
    dir === "up" ? "var(--up-soft)" : dir === "down" ? "var(--down-soft)" : "transparent";
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  const pad = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-semibold tabular ${pad}`}
      style={{ color, background: bg }}
    >
      <Icon size={size === "sm" ? 12 : 14} strokeWidth={2.5} />
      {formatPercent(value)}
    </span>
  );
}
