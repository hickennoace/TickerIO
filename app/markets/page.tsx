import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { MarketsClient } from "@/components/markets/MarketsClient";

export const metadata: Metadata = {
  title: "Market Leaders — TickerIO",
  description:
    "See today's leaders across the 11 equity sectors, leading cryptocurrencies, and top commodities — ranked by performance.",
};

export default function MarketsPage() {
  return (
    <>
      <SiteHeader />
      <MarketsClient />
    </>
  );
}
