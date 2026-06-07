import { Activity, BarChart3, Brain, Clock } from "lucide-react";
import { TickerSearch } from "@/components/TickerSearch";

const FEATURES = [
  {
    icon: BarChart3,
    title: "TradingView-grade charts",
    body: "Draw trendlines, switch intervals, and read the tape with the official Advanced Charting Library.",
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
      <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center px-4 sm:px-6">
        {/* Hero */}
        <div className="flex flex-col items-center pt-24 text-center sm:pt-32">
          <div className="mb-6 flex items-center gap-2">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
            >
              <Activity size={20} strokeWidth={2.5} color="white" />
            </span>
            <span className="text-2xl font-bold tracking-tight">
              Ticker<span style={{ color: "var(--accent)" }}>IO</span>
            </span>
          </div>

          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            The whole market truth,
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(120deg, var(--accent), var(--accent-2))" }}
            >
              one ticker away.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-balance text-lg text-[var(--fg-muted)]">
            Type a symbol and get a complete, real-time picture — charts, anchored
            performance, AI sentiment, and trend bias. No refresh.
          </p>

          <div className="mt-10 w-full max-w-xl">
            <TickerSearch size="lg" autoFocus />
          </div>
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
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)]">{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--fg-dim)]">
        Data: Yahoo Finance · Alternative.me · Forex Factory · TradingView. Analysis only, not
        financial advice.
      </footer>
    </main>
  );
}
