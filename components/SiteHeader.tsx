import Link from "next/link";
import { Activity } from "lucide-react";
import { TickerSearch } from "./TickerSearch";

export function SiteHeader({ showSearch = true }: { showSearch?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(5,7,13,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            }}
          >
            <Activity size={18} strokeWidth={2.5} color="white" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Ticker<span style={{ color: "var(--accent)" }}>IO</span>
          </span>
        </Link>

        {showSearch && (
          <div className="mx-auto hidden w-full max-w-md sm:block">
            <TickerSearch size="sm" />
          </div>
        )}

        <nav className="ml-auto hidden items-center gap-5 text-sm text-[var(--fg-muted)] md:flex">
          <span className="cursor-default">Markets</span>
          <span className="cursor-default">Screener</span>
          <span className="cursor-default">Watchlist</span>
        </nav>
      </div>
    </header>
  );
}
