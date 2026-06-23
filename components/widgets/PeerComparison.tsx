"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import type { PeersResponse, PeerRow } from "@/lib/api";
import { UI } from "@/lib/i18n/he";
import { WidgetCard } from "./WidgetCard";
import { Skeleton } from "@/components/ui/Skeleton";

function scoreColor(s: number | null): string {
  if (s == null) return "var(--fg-dim)";
  if (s >= 65) return "var(--up)";
  if (s >= 50) return "var(--warn)";
  return "var(--down)";
}

function Cell({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return (
    <td className="px-2 py-2 text-center">
      <span className="font-mono-num ltr-num text-sm" style={{ color: tone ?? "var(--fg)" }}>{children}</span>
    </td>
  );
}

function Row({ r }: { r: PeerRow }) {
  return (
    <tr style={{ background: r.isTarget ? "var(--panel-2)" : "transparent" }}>
      <td className="px-2 py-2">
        <Link href={`/${encodeURIComponent(r.symbol)}`} className="text-sm font-semibold hover:underline" style={{ color: r.isTarget ? "var(--accent)" : "var(--fg)" }}>
          {r.display}
        </Link>
      </td>
      <Cell tone={scoreColor(r.composite)}>{r.composite ?? "—"}</Cell>
      <Cell>{r.pePct ?? "—"}</Cell>
      <Cell tone={r.netMarginPct != null && r.netMarginPct < 0 ? "var(--down)" : undefined}>
        {r.netMarginPct != null ? `${r.netMarginPct}%` : "—"}
      </Cell>
      <Cell tone={r.revenueGrowthPct != null ? (r.revenueGrowthPct >= 0 ? "var(--up)" : "var(--down)") : undefined}>
        {r.revenueGrowthPct != null ? `${r.revenueGrowthPct > 0 ? "+" : ""}${r.revenueGrowthPct}%` : "—"}
      </Cell>
    </tr>
  );
}

/** Peer / sector comparison — the symbol ranked against its sector bellwethers,
 *  with its composite percentile. Renders nothing when no curated peer set
 *  exists for the symbol (most non-mega-cap names / non-equities). */
export function PeerComparison({ data, loading }: { data?: PeersResponse; loading: boolean }) {
  if (loading) {
    return (
      <WidgetCard title={UI.peers}>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </WidgetCard>
    );
  }
  if (!data || data.rows.length === 0) return null; // no peer set → don't show an empty card

  return (
    <WidgetCard
      title={UI.peers}
      action={
        data.compositePercentile != null ? (
          <span className="text-[11px]" style={{ color: "var(--fg-dim)" }}>
            {UI.peersPercentile}: <span className="font-mono-num ltr-num font-semibold" style={{ color: "var(--fg)" }}>{data.compositePercentile}%</span>
            {data.sector ? ` · ${data.sector}` : ""}
          </span>
        ) : null
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] text-[11px]" style={{ color: "var(--fg-muted)" }}>
              <th className="px-2 py-1.5 text-start font-medium">נייר</th>
              <th className="px-2 py-1.5 font-medium">{UI.peerComposite}</th>
              <th className="px-2 py-1.5 font-medium">P/E</th>
              <th className="px-2 py-1.5 font-medium">מרווח</th>
              <th className="px-2 py-1.5 font-medium">צמיחה</th>
            </tr>
          </thead>
          <tbody>{data.rows.map((r) => <Row key={r.symbol} r={r} />)}</tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px]" style={{ color: "var(--fg-dim)" }}>{UI.notAdviceShort} · {UI.fundamentalsViaYahoo}</p>
    </WidgetCard>
  );
}
