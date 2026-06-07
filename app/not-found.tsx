import Link from "next/link";
import { Activity } from "lucide-react";
import { TickerSearch } from "@/components/TickerSearch";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span
          className="grid h-9 w-9 place-items-center rounded-xl"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <Activity size={20} strokeWidth={2.5} color="white" />
        </span>
        <span className="text-2xl font-bold tracking-tight">
          Ticker<span style={{ color: "var(--accent)" }}>IO</span>
        </span>
      </Link>
      <h1 className="text-5xl font-bold tracking-tight">404</h1>
      <p className="mt-3 max-w-md text-[var(--fg-muted)]">
        That page doesn&apos;t exist. Search a ticker to pull up its dashboard.
      </p>
      <div className="mt-8 w-full max-w-md">
        <TickerSearch size="lg" />
      </div>
    </main>
  );
}
