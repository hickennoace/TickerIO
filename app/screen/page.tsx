import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { ScreenerClient } from "@/components/screen/ScreenerClient";

export const metadata: Metadata = {
  title: "סקרינר פונדמנטלי — TickerIO",
  description: "דירוג מניות מובילות לפי רווחיות, הערכת שווי ותזרים — מנוע הניתוח של TickerIO.",
};

export default function ScreenPage() {
  return (
    <>
      <SiteHeader />
      <ScreenerClient />
    </>
  );
}
