import { MarketOverview } from "@/components/MarketOverview";
import { TickerTape } from "@/components/TickerTape";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Hero } from "@/components/landing/Hero";
import { QuickAccess } from "@/components/landing/QuickAccess";
import { FeatureGrid } from "@/components/landing/FeatureGrid";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <TickerTape />

      <div className="mx-auto flex w-full max-w-[1120px] justify-end px-4 pt-4 sm:px-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-center px-4 sm:px-6">
        {/* Hero */}
        <Hero />

        {/* Jump straight into the app */}
        <div className="mt-16 w-full">
          <QuickAccess />
        </div>

        {/* Live market overview */}
        <div className="mt-20 w-full">
          <MarketOverview />
        </div>

        {/* Features */}
        <div className="mt-24 w-full">
          <FeatureGrid />
        </div>
      </div>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--fg-dim)]">
        Data: Yahoo Finance · CoinDesk · FXStreet · Alternative.me · Forex Factory · TradingView.
        Analysis only, not financial advice.
      </footer>
    </main>
  );
}
