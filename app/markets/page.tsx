import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { MarketsClient } from "@/components/markets/MarketsClient";

export const metadata: Metadata = {
  title: "מובילי השוק — TickerIO",
  description:
    "המובילים של היום על פני 11 סקטורי המניות, מטבעות הקריפטו המובילים והסחורות הבולטות — מדורגים לפי ביצועים.",
};

export default function MarketsPage() {
  return (
    <>
      <SiteHeader />
      <MarketsClient />
    </>
  );
}
