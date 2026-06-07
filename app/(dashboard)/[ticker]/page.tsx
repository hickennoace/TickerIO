import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { PriceHeader } from "@/components/widgets/PriceHeader";
import { ChartPanel } from "@/components/widgets/ChartPanel";
import { TimeframePanel } from "@/components/widgets/TimeframePanel";
import { FearGreedGauge } from "@/components/widgets/FearGreedGauge";
import { TrendBiasIndicator } from "@/components/widgets/TrendBiasIndicator";
import { AiSummaryCard } from "@/components/widgets/AiSummaryCard";
import { NewsFeed } from "@/components/widgets/NewsFeed";
import { getDemoSnapshot } from "@/lib/demo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const symbol = decodeURIComponent(ticker).toUpperCase();
  return { title: `${symbol} — TickerIO` };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const symbol = decodeURIComponent(ticker).toUpperCase();
  const snap = getDemoSnapshot(symbol);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
        <PriceHeader snap={snap} />

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
          {/* Left column — chart + AI + news */}
          <div className="flex flex-col gap-5">
            <ChartPanel symbol={snap.symbol} />
            <AiSummaryCard snap={snap} />
            <NewsFeed news={snap.news} />
          </div>

          {/* Right column — performance + sentiment */}
          <div className="flex flex-col gap-5">
            <TimeframePanel timeframes={snap.timeframes} />
            <FearGreedGauge score={snap.fearGreed} />
            <TrendBiasIndicator bias={snap.trendBias} tech={snap.techScore} sent={snap.sentScore} />
          </div>
        </div>

        <p className="mt-8 text-center text-xs" style={{ color: "var(--fg-dim)" }}>
          Demo data shown for layout. Live market data, real anchored timeframes, and
          streaming AI land in Phases 1–4. · Analysis only, not financial advice.
        </p>
      </main>
    </>
  );
}
