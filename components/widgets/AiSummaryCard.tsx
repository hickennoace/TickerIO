"use client";

import { Sparkles } from "lucide-react";
import type { AiSummaryResponse } from "@/lib/api";
import { WidgetCard } from "./WidgetCard";
import { Skeleton } from "@/components/ui/Skeleton";

function pillColor(s: AiSummaryResponse["sentiment"]): string {
  return s === "Bullish" ? "var(--up)" : s === "Bearish" ? "var(--down)" : "var(--warn)";
}

/** AI bottom-line (CLAUDE.md §5.2). Streams from /api/ai-summary; heuristic fallback when no LLM key. */
export function AiSummaryCard({
  data,
  loading,
}: {
  data?: AiSummaryResponse;
  loading: boolean;
}) {
  return (
    <WidgetCard
      title="AI News Impact"
      action={
        data ? (
          <span
            className="rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{ color: pillColor(data.sentiment), background: "var(--panel-2)" }}
          >
            {data.sentiment}
          </span>
        ) : null
      }
    >
      <div className="flex gap-3">
        <span
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <Sparkles size={16} color="white" />
        </span>
        {loading || !data ? (
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-[var(--fg)]">{data.summary}</p>
        )}
      </div>
      <p className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-[11px]" style={{ color: "var(--fg-dim)" }}>
        <span>AI-generated analysis, not financial advice.</span>
        {data && <span>via {data.generatedBy}</span>}
      </p>
    </WidgetCard>
  );
}
