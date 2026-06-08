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
  useAiSummary,
  useCalendar,
  useCandles,
  useNews,
  useQuote,
  useSentiment,
  useTimeframes,
  useTrendBias,
  usePriceStream,
} from "@/lib/hooks";
import { useBias } from "@/store/useBias";
import { useWidgetOrder, reconcileOrder, DEFAULT_ORDER } from "@/store/useWidgetOrder";
import { Reveal } from "@/components/ui/Reveal";
import { SortableWidget } from "./SortableWidget";
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

  // Live price ticks via SSE → patches the quote cache in place.
  usePriceStream(symbol);

  const quote = quoteQ.data;
  const spark = candlesQ.data?.candles.map((c) => c.c) ?? [];
  const bias = biasQ.data?.bias ?? 0;

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

  const widgetNodes: Record<string, ReactNode> = {
    performance: <TimeframePanel rows={tfQ.data?.rows} currency={tfQ.data?.currency} loading={tfQ.isLoading} />,
    keystats: <KeyStats quote={quote} loading={quoteQ.isLoading} />,
    feargreed: <FearGreedGauge score={sentQ.data?.score} source={sentQ.data?.source} loading={sentQ.isLoading} />,
    trendbias: (
      <TrendBiasIndicator
        bias={biasQ.data?.bias}
        technical={biasQ.data?.technical}
        sentiment={biasQ.data?.sentiment}
        label={biasQ.data?.label}
        loading={biasQ.isLoading}
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
          <Reveal delay={0.1}>
            <AiSummaryCard data={aiQ.data} loading={aiQ.isLoading} />
          </Reveal>
          <Reveal delay={0.15}>
            <NewsFeed
              items={newsQ.data?.items}
              sources={newsQ.data?.sources}
              digest={newsQ.data?.digest}
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
                Tip: hover a card and drag ⠿ to reorder your dashboard.
              </p>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <p className="mt-8 text-center text-xs" style={{ color: "var(--fg-dim)" }}>
        Data: Yahoo Finance · CoinDesk · FXStreet · Alternative.me · Forex Factory · TradingView.
        Aggregated for information only — analysis, not financial advice.
      </p>
    </main>
  );
}
