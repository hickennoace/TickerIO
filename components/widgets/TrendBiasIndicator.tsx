import { WidgetCard } from "./WidgetCard";
import { DemoBadge } from "@/components/ui/DemoBadge";

function biasLabel(score: number): string {
  if (score <= -60) return "Strong Bearish";
  if (score < -20) return "Bearish";
  if (score <= 20) return "Neutral";
  if (score < 60) return "Bullish";
  return "Strong Bullish";
}

function biasColor(score: number): string {
  if (score < -20) return "var(--down)";
  if (score > 20) return "var(--up)";
  return "var(--warn)";
}

function Bar({ label, value }: { label: string; value: number }) {
  // value: -100..100 → bar fills from center.
  const pct = Math.min(100, Math.abs(value));
  const color = value < 0 ? "var(--down)" : "var(--up)";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span style={{ color: "var(--fg-muted)" }}>{label}</span>
        <span className="font-mono-num" style={{ color }}>
          {value > 0 ? "+" : ""}
          {value}
        </span>
      </div>
      <div className="relative h-2 rounded-full" style={{ background: "var(--panel-2)" }}>
        <div className="absolute left-1/2 top-0 h-full w-px" style={{ background: "var(--border-strong)" }} />
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            background: color,
            width: `${pct / 2}%`,
            left: value < 0 ? `${50 - pct / 2}%` : "50%",
          }}
        />
      </div>
    </div>
  );
}

/** Algorithmic trend bias: technical momentum + news sentiment (CLAUDE.md §5.3). */
export function TrendBiasIndicator({
  bias,
  tech,
  sent,
}: {
  bias: number;
  tech: number;
  sent: number;
}) {
  return (
    <WidgetCard title="Trend Bias" action={<DemoBadge />}>
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color: biasColor(bias) }}>
          {biasLabel(bias)}
        </span>
        <span className="font-mono-num text-sm" style={{ color: "var(--fg-dim)" }}>
          {bias > 0 ? "+" : ""}
          {bias}
        </span>
      </div>
      <div className="space-y-3">
        <Bar label="Technical momentum" value={tech} />
        <Bar label="News sentiment" value={sent} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--fg-dim)" }}>
        Weighted 60% technical · 40% sentiment.
      </p>
    </WidgetCard>
  );
}
