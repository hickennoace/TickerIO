import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { CompareClient } from "@/components/compare/CompareClient";

export const metadata: Metadata = {
  title: "Compare — TickerIO",
  description: "Compare normalized performance across stocks, crypto, and forex.",
};

export default function ComparePage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<div className="p-8 text-sm text-[var(--fg-dim)]">Loading compare…</div>}>
        <CompareClient />
      </Suspense>
    </>
  );
}
