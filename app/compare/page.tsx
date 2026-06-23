import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { CompareClient } from "@/components/compare/CompareClient";

export const metadata: Metadata = {
  title: "השוואה — TickerIO",
  description: "השוואת ביצועים מנורמלים בין מניות, קריפטו ומט\"ח.",
};

export default function ComparePage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<div className="p-8 text-sm text-[var(--fg-dim)]">טוען השוואה…</div>}>
        <CompareClient />
      </Suspense>
    </>
  );
}
