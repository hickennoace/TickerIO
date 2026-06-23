"use client";

import { useState } from "react";
import { Info, ExternalLink } from "lucide-react";
import type { AssetProfileResponse } from "@/lib/api";
import { UI } from "@/lib/i18n/he";
import { WidgetCard } from "./WidgetCard";
import { Skeleton } from "@/components/ui/Skeleton";

const META_LABEL: Record<string, string> = {
  sector: "סקטור",
  industry: "תעשייה",
  country: "מדינה",
  employees: "עובדים",
};

/** Chars of the summary to show before the "Read more" fold. */
const CLAMP = 360;

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--fg-dim)" }}>
        {label}
      </span>
      <span className="text-xs font-medium text-[var(--fg)]">{value}</span>
    </div>
  );
}

/**
 * "About" the asset — a factual overview of what it is, what it does, and (for
 * companies) its flagship products. Sourced from Yahoo's business profile or the
 * matching Wikipedia article; never an AI guess. See /api/profile.
 */
export function AssetProfileCard({
  data,
  display,
  loading,
}: {
  data?: AssetProfileResponse;
  display: string;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const long = (data?.summary.length ?? 0) > CLAMP;
  const text = data
    ? open || !long
      ? data.summary
      : `${data.summary.slice(0, CLAMP).trimEnd()}…`
    : "";

  return (
    <WidgetCard
      title={UI.about(data?.display ?? display)}
      action={
        data?.url ? (
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline"
          >
            {data.source === "Wikipedia" ? "ויקיפדיה" : "אתר רשמי"}
            <ExternalLink size={12} />
          </a>
        ) : null
      }
    >
      <div className="flex gap-3">
        <span
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <Info size={16} color="white" />
        </span>

        {loading ? (
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : !data ? (
          <p className="flex-1 text-sm text-[var(--fg-muted)]">
            {UI.noOverview(display)}
          </p>
        ) : (
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-[var(--fg)]">
              {text}
              {long && (
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="ms-1 font-medium text-[var(--accent)] hover:underline"
                >
                  {open ? UI.showLess : UI.readMore}
                </button>
              )}
            </p>

            {(data.sector || data.industry || data.country || data.employees) && (
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-4">
                {data.sector && <Meta label={META_LABEL.sector} value={data.sector} />}
                {data.industry && <Meta label={META_LABEL.industry} value={data.industry} />}
                {data.country && <Meta label={META_LABEL.country} value={data.country} />}
                {data.employees && (
                  <Meta label={META_LABEL.employees} value={data.employees.toLocaleString()} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <p
        className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-[11px]"
        style={{ color: "var(--fg-dim)" }}
      >
        <span>{UI.refDisclaimer}</span>
        {data && <span>{UI.via(data.source)}</span>}
      </p>
    </WidgetCard>
  );
}
