import { formatPrice, formatSignedPrice, direction } from "@/lib/format";
import type { DemoSnapshot } from "@/lib/demo";
import { ChangePill } from "@/components/ui/ChangePill";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Sparkline } from "./Sparkline";

export function PriceHeader({ snap }: { snap: DemoSnapshot }) {
  const dir = direction(snap.dayChangePct);
  const up = dir !== "down";

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{snap.symbol}</h1>
            <span
              className="rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]"
              style={{ borderColor: "var(--border-strong)" }}
            >
              {snap.assetClass}
            </span>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">{snap.name}</p>

          <div className="mt-4 flex items-end gap-3">
            <span className="font-mono-num text-4xl font-semibold leading-none">
              {formatPrice(snap.price)}
            </span>
            <div className="flex items-center gap-2 pb-1">
              <ChangePill value={snap.dayChangePct} />
              <span
                className="font-mono-num text-sm"
                style={{ color: up ? "var(--up)" : "var(--down)" }}
              >
                {formatSignedPrice(snap.dayChangeAbs)}
              </span>
            </div>
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--fg-dim)" }}>
            Today · since {snap.assetClass === "crypto" ? "00:00 UTC" : "session open"}
          </p>
        </div>

        <div className="ml-auto">
          <Sparkline data={snap.sparkline} up={up} width={260} height={64} />
        </div>
      </div>
    </section>
  );
}
