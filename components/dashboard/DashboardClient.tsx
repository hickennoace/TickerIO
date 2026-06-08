"use client";

import {
  useAiSummary,
  useCalendar,
  useCandles,
  useNews,
  useQuote,
  useSentiment,
  useTimeframes,
  useTrendBias,
} from "@/lib/hooks";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Reveal } from "@/components/ui/Reveal";
import { PriceHeader } from "@/components/widgets/PriceHeader";
import { ChartPanel } from "@/components/widgets/ChartPanel";
import { TimeframePanel } from "@/components/widgets/TimeframePanel";
import { FearGreedGauge } from "@/components/widgets/FearGreedGauge";
import { TrendBiasIndicator } from "@/components/widgets/TrendBiasIndicator";
import { AiSummaryCard } from "@/components/widgets/AiSummaryCard";
import { NewsFeed } from "@/components/widgets/NewsFeed";
import { EconomicCalendar } from "@/components/widgets/EconomicCalendar";
import { KeyStats } from "@/components/widgets/KeyStats";
import { Skeleton } from "@/components/ui/Skeleton";

export function DashboardClient({ symbol }: { symbol: string }) {
  const quoteQ = useQuote(symbol);
  const candlesQ = useCandles(symbol);
  const tfQ = useTimeframes(symbol);
  const sentQ = useSentiment(symbol);
  const biasQ = useTrendBias(symbol);
  const newsQ = useNews(symbol);
  const aiQ = useAiSummary(symbol);
  const calQ = useCalendar();

  const quote = quoteQ.data;
  const spark = candlesQ.data?.candles.map((c) => c.c) ?? [];
  const bias = biasQ.data?.bias ?? 0;

  return (
    <>
      <AuroraBackground bias={bias} />

      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
        <Reveal>
          <PriceHeader
            quote={quote}
            spark={spark}
            loading={quoteQ.isLoading}
            error={quoteQ.error instanceof Error ? quoteQ.error.message : null}
          />
        </Reveal>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_372px]">
          {/* Left — chart, AI, news */}
          <div className="flex flex-col gap-5">
            <Reveal delay={0.05}>
              {quote ? (
                <ChartPanel symbol={quote.symbol} display={quote.display} assetClass={quote.assetClass} />
              ) : (
                <Skeleton className="h-[620px] w-full rounded-2xl" />
              )}
            </Reveal>
            <Reveal delay={0.1}>
              <AiSummaryCard data={aiQ.data} loading={aiQ.isLoading} />
            </Reveal>
            <Reveal delay={0.15}>
              <NewsFeed items={newsQ.data?.items} sources={newsQ.data?.sources} loading={newsQ.isLoading} />
            </Reveal>
          </div>

          {/* Right — performance, sentiment, bias, events */}
          <div className="flex flex-col gap-5">
            <Reveal delay={0.08}>
              <TimeframePanel rows={tfQ.data?.rows} currency={tfQ.data?.currency} loading={tfQ.isLoading} />
            </Reveal>
            <Reveal delay={0.1}>
              <KeyStats quote={quote} loading={quoteQ.isLoading} />
            </Reveal>
            <Reveal delay={0.13}>
              <FearGreedGauge score={sentQ.data?.score} source={sentQ.data?.source} loading={sentQ.isLoading} />
            </Reveal>
            <Reveal delay={0.18}>
              <TrendBiasIndicator
                bias={biasQ.data?.bias}
                technical={biasQ.data?.technical}
                sentiment={biasQ.data?.sentiment}
                label={biasQ.data?.label}
                loading={biasQ.isLoading}
              />
            </Reveal>
            <Reveal delay={0.23}>
              <EconomicCalendar events={calQ.data?.events} source={calQ.data?.source} loading={calQ.isLoading} />
            </Reveal>
          </div>
        </div>

        <p className="mt-8 text-center text-xs" style={{ color: "var(--fg-dim)" }}>
          Data: Yahoo Finance · Alternative.me · Forex Factory · TradingView. Aggregated for
          information only — analysis, not financial advice.
        </p>
      </main>
    </>
  );
}
