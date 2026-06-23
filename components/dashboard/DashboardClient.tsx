"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  useCalendar,
  useCandles,
  useFundamentals,
  useNews,
  useOverview,
  usePeers,
  useProfile,
  useQuote,
  usePriceStream,
} from "@/lib/hooks";
import { useBias } from "@/store/useBias";
import { useWidgetOrder, reconcileOrder, DEFAULT_ORDER } from "@/store/useWidgetOrder";
import { UI } from "@/lib/i18n/he";
import { Reveal } from "@/components/ui/Reveal";
import { SortableWidget } from "./SortableWidget";
import { PriceHeader } from "@/components/widgets/PriceHeader";
import { ChartPanel } from "@/components/widgets/ChartPanel";
import { TimeframePanel } from "@/components/widgets/TimeframePanel";
import { FearGreedGauge } from "@/components/widgets/FearGreedGauge";
import { TrendBiasIndicator } from "@/components/widgets/TrendBiasIndicator";
import { FundamentalAnalysis } from "@/components/widgets/FundamentalAnalysis";
import { PeerComparison } from "@/components/widgets/PeerComparison";
import { AssetProfileCard } from "@/components/widgets/AssetProfile";
import { NewsFeed } from "@/components/widgets/NewsFeed";
import { EconomicCalendar } from "@/components/widgets/EconomicCalendar";
import { KeyStats } from "@/components/widgets/KeyStats";
import { Skeleton } from "@/components/ui/Skeleton";

export function DashboardClient({ symbol }: { symbol: string }) {
  const quoteQ = useQuote(symbol);
  const candlesQ = useCandles(symbol);
  const overviewQ = useOverview(symbol);
  const newsQ = useNews(symbol);
  const fundQ = useFundamentals(symbol);
  const profileQ = useProfile(symbol);
  const calQ = useCalendar();
  const isEquity = quoteQ.data?.assetClass === "equity";
  const peersQ = usePeers(symbol, isEquity);

  // Live price ticks via SSE → patches the quote cache in place.
  usePriceStream(symbol);

  const quote = quoteQ.data;
  const spark = candlesQ.data?.candles.map((c) => c.c) ?? [];
  const bias = overviewQ.data?.trendBias.bias ?? 0;

  // Tint the global living background to this symbol's bias; reset on leave.
  const setBias = useBias((s) => s.setBias);
  useEffect(() => {
    setBias(bias);
    return () => setBias(0);
  }, [bias, setBias]);

  // Reorderable right-rail widgets (persisted). Default order pre-mount to avoid
  // hydration mismatch, then switch to the user's saved order.
  const storedOrder = useWidgetOrder((s) => s.order);
  const setOrder = useWidgetOrder((s) => s.setOrder);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const order = mounted ? reconcileOrder(storedOrder) : [...DEFAULT_ORDER];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const from = order.indexOf(String(active.id));
      const to = order.indexOf(String(over.id));
      if (from !== -1 && to !== -1) setOrder(arrayMove(order, from, to));
    }
  }

  const ov = overviewQ.data;
  const widgetNodes: Record<string, ReactNode> = {
    performance: <TimeframePanel rows={ov?.timeframes.rows} currency={ov?.timeframes.currency} loading={overviewQ.isLoading} />,
    keystats: <KeyStats quote={quote} loading={quoteQ.isLoading} />,
    feargreed: <FearGreedGauge score={ov?.sentiment.score} source={ov?.sentiment.source} loading={overviewQ.isLoading} />,
    trendbias: (
      <TrendBiasIndicator
        bias={ov?.trendBias.bias}
        technical={ov?.trendBias.technical}
        sentiment={ov?.trendBias.sentiment}
        label={ov?.trendBias.label}
        loading={overviewQ.isLoading}
      />
    ),
    calendar: <EconomicCalendar events={calQ.data?.events} source={calQ.data?.source} loading={calQ.isLoading} />,
  };

  return (
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
          <Reveal delay={0.08}>
            <AssetProfileCard data={profileQ.data} display={quote?.display ?? symbol} loading={profileQ.isLoading} />
          </Reveal>
          <Reveal delay={0.1}>
            <FundamentalAnalysis data={fundQ.data} loading={fundQ.isLoading} />
          </Reveal>
          {isEquity && (
            <Reveal delay={0.12}>
              <PeerComparison data={peersQ.data} loading={peersQ.isLoading} />
            </Reveal>
          )}
          <Reveal delay={0.15}>
            <NewsFeed
              symbol={symbol}
              items={newsQ.data?.items}
              sources={newsQ.data?.sources}
              loading={newsQ.isLoading}
            />
          </Reveal>
        </div>

        {/* Right — reorderable widget rail */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-5">
              {order.map((id) => (
                <SortableWidget key={id} id={id}>
                  {widgetNodes[id]}
                </SortableWidget>
              ))}
              <p className="text-center text-[11px]" style={{ color: "var(--fg-dim)" }}>
                {UI.dragHint}
              </p>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <p className="mt-8 text-center text-xs" style={{ color: "var(--fg-dim)" }}>
        {UI.dataFooter}
      </p>
    </main>
  );
}
