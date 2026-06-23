"use client";

import { motion } from "motion/react";
import { TrendingUp, Coins, Wallet, ShieldCheck, Newspaper } from "lucide-react";
import type { FundamentalsResponse, FundPillar, FundMetric, FundBand } from "@/lib/api";
import { UI } from "@/lib/i18n/he";
import { WidgetCard } from "./WidgetCard";
import { Skeleton } from "@/components/ui/Skeleton";

function bandColor(band: FundBand | null): string {
  if (band === "excellent" || band === "good") return "var(--up)";
  if (band === "fair") return "var(--warn)";
  if (band === "weak" || band === "poor") return "var(--down)";
  return "var(--fg-muted)";
}

function leanColor(lean: FundamentalsResponse["news"]["lean"]): string {
  return lean === "Bullish" ? "var(--up)" : lean === "Bearish" ? "var(--down)" : "var(--warn)";
}

const PILLAR_ICON: Record<string, typeof TrendingUp> = {
  profitability: TrendingUp,
  valuation: Coins,
  cashFlow: Wallet,
  strengthForward: ShieldCheck,
};

function GradeChip({ band, word }: { band: FundBand | null; word: string | null }) {
  if (!word) {
    return (
      <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ color: "var(--fg-dim)", background: "var(--panel-2)" }}>
        {UI.partialData}
      </span>
    );
  }
  return (
    <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ color: bandColor(band), background: "var(--panel-2)" }}>
      {word}
    </span>
  );
}

function ScoreBar({ score, band }: { score: number; band: FundBand | null }) {
  return (
    <div className="relative h-2 flex-1 rounded-full" style={{ background: "var(--panel-2)" }}>
      <motion.div
        className="absolute top-0 h-full rounded-full"
        style={{ insetInlineStart: 0, background: bandColor(band) }}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

function MetricRow({ m }: { m: FundMetric }) {
  const color = m.tone === "up" ? "var(--up)" : m.tone === "down" ? "var(--down)" : "var(--fg)";
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] py-1.5 last:border-0">
      <span className="text-sm" style={{ color: "var(--fg-muted)" }} title={m.hint || undefined}>
        {m.label}
      </span>
      <span className="font-mono-num ltr-num text-sm" style={{ color }}>
        {m.value}
      </span>
    </div>
  );
}

function PillarBlock({ p }: { p: FundPillar }) {
  const Icon = PILLAR_ICON[p.key] ?? TrendingUp;
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--fg)]">
          <Icon size={15} style={{ color: "var(--fg-muted)" }} /> {p.title}
        </h4>
        <GradeChip band={p.band} word={p.bandWord} />
      </div>
      {p.score != null && (
        <div className="mb-3 flex items-center gap-3">
          <ScoreBar score={p.score} band={p.band} />
          <span className="font-mono-num ltr-num text-xs" style={{ color: "var(--fg-dim)" }}>{p.score}</span>
        </div>
      )}
      <p className="mb-3 text-sm leading-relaxed text-[var(--fg)]">{p.verdict}</p>
      {p.metrics.length > 0 && <div className="space-y-0.5">{p.metrics.map((m) => <MetricRow key={m.id} m={m} />)}</div>}
      {p.notes.length > 0 && (
        <ul className="mt-3 space-y-1">
          {p.notes.map((n, i) => (
            <li key={i} className="text-[11px] leading-relaxed" style={{ color: "var(--fg-dim)" }}>• {n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewsImpact({ news }: { news: FundamentalsResponse["news"] }) {
  return (
    <div className="mt-5 rounded-[var(--radius-sm)] border border-[var(--border)] p-4" style={{ background: "var(--panel-2)" }}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--fg)]">
          <Newspaper size={15} style={{ color: "var(--fg-muted)" }} /> {UI.newsImpact}
        </h4>
        <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ color: leanColor(news.lean), background: "var(--panel)" }}>
          {news.label}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-[var(--fg)]">{news.text}</p>
    </div>
  );
}

function Footer({ generatedBy }: { generatedBy: string }) {
  return (
    <p className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-[11px]" style={{ color: "var(--fg-dim)" }}>
      <span>{UI.aiDisclaimer} · {UI.fundamentalsViaYahoo}</span>
      <span>{UI.via(generatedBy)}</span>
    </p>
  );
}

function LoadingState() {
  return (
    <WidgetCard title={UI.fundamentalAnalysis}>
      <div className="mb-5 flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-xl" />)}
      </div>
    </WidgetCard>
  );
}

/**
 * Hebrew fundamental analysis (CLAUDE.md §5.2, extended). Composite grade + the
 * five user-requested sections: רווחיות, הערכת שווי, תזרים מזומנים, איתנות
 * פיננסית ונתונים עתידיים, וניתוח פונדמנטלי של החדשות. All verdicts are LLM
 * narrations of deterministically-computed scores (heuristic Hebrew fallback).
 * Crypto/forex/index degrade to a market + news read.
 */
export function FundamentalAnalysis({ data, loading }: { data?: FundamentalsResponse; loading: boolean }) {
  if (loading || !data) return <LoadingState />;

  const compositeColor = bandColor(data.compositeBand);

  // Degraded (crypto / forex / index) — market read + news only.
  if (data.degraded) {
    return (
      <WidgetCard title={UI.fundamentalAnalysis}>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>{UI.degradedNotice}</p>
        <p className="mb-4 text-sm leading-relaxed text-[var(--fg)]">{data.overview}</p>
        {data.marketRead.length > 0 && (
          <>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--fg-muted)" }}>{UI.marketRead}</h4>
            <div className="space-y-0.5">{data.marketRead.map((m) => <MetricRow key={m.id} m={m} />)}</div>
          </>
        )}
        <NewsImpact news={data.news} />
        <Footer generatedBy={data.generatedBy} />
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title={UI.fundamentalAnalysis}>
      {/* Composite header */}
      <div className="mb-5 flex items-start gap-4">
        <div
          className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl"
          style={{ background: "var(--panel-2)", border: `1px solid ${compositeColor}` }}
        >
          <span className="font-mono-num ltr-num text-3xl font-bold" style={{ color: compositeColor }}>
            {data.composite ?? "—"}
          </span>
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--fg-dim)" }}>{UI.overallGrade}</span>
            {data.compositeWord && (
              <span className="text-lg font-bold" style={{ color: compositeColor }}>{data.compositeWord}</span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-[var(--fg)]">{data.overview}</p>
        </div>
      </div>

      {/* Pillars 1–4 */}
      <div className="grid gap-4 xl:grid-cols-2">
        {data.pillars.map((p) => <PillarBlock key={p.key} p={p} />)}
      </div>

      {/* Section 5 — news fundamental analysis */}
      <NewsImpact news={data.news} />
      <Footer generatedBy={data.generatedBy} />
    </WidgetCard>
  );
}
