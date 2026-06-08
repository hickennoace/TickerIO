import { Activity, BarChart3, Brain, Clock } from "lucide-react";
import { TickerSearch } from "@/components/TickerSearch";
import { MarketOverview } from "@/components/MarketOverview";
import { TickerTape } from "@/components/TickerTape";
import { LivePulse } from "@/components/ui/LivePulse";

const FEATURES = [
  {
    icon: BarChart3,
    title: "TradingView-grade charts",
    body: "Draw trendlines, switch intervals, and read the tape with the official Advanced Charting widget.",
  },
  {
    icon: Clock,
    title: "Anchored timeframes",
    body: "Weekly means the week's open — not a rolling 7-day lookback. The way prop desks actually read it.",
  },
  {
    icon: Brain,
    title: "AI sentiment & bias",
    body: "Background news and reports distilled into a bottom-line read, a Fear & Greed gauge, and a trend bias.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <TickerTape />

      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-center px-4 sm:px-6">
        {/* Hero */}
        <div className="flex flex-col items-center pt-20 text-center sm:pt-28">
          <div className="mb-6 flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl shadow-lg"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", boxShadow: "0 8px 24px -8px var(--accent-glow)" }}
            >
              <Activity size={20} strokeWidth={2.5} color="white" />
            </span>
            <span className="font-display text-2xl font-bold tracking-tight">
              Ticker<span style={{ color: "var(--accent)" }}>IO</span>
            </span>
          </div>

          <div
            className="mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.02)", color: "var(--fg-muted)" }}
          >
            <LivePulse color="var(--up)" />
            Live data · Yahoo · CoinDesk · FXStreet · Forex Factory
          </div>

          <h1 className="font-display max-w-4xl text-5xl font-extrabold leading-[1.04] tracking-tight sm:text-7xl">
            The whole market truth,
            <br />
            <span className="text-gradient">one ticker away.</span>
          </h1>

          <p className="mt-7 max-w-xl text-balance text-lg leading-relaxed text-[var(--fg-muted)]">
            Type a symbol for a complete, real-time read — TradingView charts, anchored
            performance, AI sentiment, and trend bias. One page, no refresh.
          </p>

          <div className="mt-10 w-full max-w-xl">
            <TickerSearch size="lg" autoFocus />
          </div>
        </div>

        {/* Live market overview */}
        <div className="mt-24 w-full">
          <MarketOverview />
        </div>

        {/* Features */}
        <div className="mt-24 grid w-full gap-4 pb-24 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel panel-hover p-6 text-left">
              <span
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: "var(--panel-2)" }}
              >
                <f.icon size={20} style={{ color: "var(--accent)" }} />
              </span>
              <h3 className="font-display mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)]">{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--fg-dim)]">
        Data: Yahoo Finance · CoinDesk · FXStreet · Alternative.me · Forex Factory · TradingView.
        Analysis only, not financial advice.
      </footer>
    </main>
  );
}
