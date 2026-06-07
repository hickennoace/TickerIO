import { Sparkles } from "lucide-react";
import type { DemoSnapshot } from "@/lib/demo";
import { WidgetCard } from "./WidgetCard";
import { DemoBadge } from "@/components/ui/DemoBadge";

function biasWord(bias: number): string {
  if (bias <= -20) return "bearish";
  if (bias >= 20) return "bullish";
  return "mixed";
}

/**
 * AI bottom-line summary (CLAUDE.md §5.2). In Phase 4 this streams from
 * /api/ai-summary via the Vercel AI SDK. For now it composes a deterministic
 * sentence from the demo snapshot, clearly badged.
 */
export function AiSummaryCard({ snap }: { snap: DemoSnapshot }) {
  const word = biasWord(snap.trendBias);
  const summary = `Near-term flow on ${snap.symbol} reads ${word}. Momentum and recent headlines point ${
    snap.trendBias >= 0 ? "toward continuation" : "toward caution"
  }, with the Fear & Greed gauge at ${snap.fearGreed}. Watch the ${
    snap.assetClass === "crypto" ? "weekly UTC open" : "session open"
  } as the key reference level.`;

  return (
    <WidgetCard
      title="AI News Impact"
      action={
        <span className="flex items-center gap-2">
          <DemoBadge />
        </span>
      }
    >
      <div className="flex gap-3">
        <span
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <Sparkles size={16} color="white" />
        </span>
        <p className="text-sm leading-relaxed text-[var(--fg)]">{summary}</p>
      </div>
      <p className="mt-4 border-t border-[var(--border)] pt-3 text-[11px] leading-relaxed" style={{ color: "var(--fg-dim)" }}>
        AI-generated analysis, not financial advice.
      </p>
    </WidgetCard>
  );
}
