import Link from "next/link";
import { Activity } from "lucide-react";
import { TickerSearch } from "./TickerSearch";
import { CommandHint } from "./CommandHint";
import { TickerTape } from "./TickerTape";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader({ showSearch = true }: { showSearch?: boolean }) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--header-bg)]">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 border-b border-[var(--border)] px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: "0 6px 18px -6px var(--accent-glow)",
            }}
          >
            <Activity size={18} strokeWidth={2.5} color="white" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Ticker<span style={{ color: "var(--accent)" }}>IO</span>
          </span>
        </Link>

        {showSearch && (
          <div className="mx-auto hidden w-full max-w-md sm:block">
            <TickerSearch size="sm" />
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          <nav className="hidden items-center gap-5 text-sm text-[var(--fg-muted)] md:flex">
            <Link href="/" className="transition-colors hover:text-[var(--fg)]">
              Markets
            </Link>
            <Link href="/watchlist" className="transition-colors hover:text-[var(--fg)]">
              Watchlist
            </Link>
            <Link href="/compare" className="transition-colors hover:text-[var(--fg)]">
              Compare
            </Link>
          </nav>
          <CommandHint />
          <ThemeToggle />
        </div>
      </div>
      <TickerTape />
    </header>
  );
}
