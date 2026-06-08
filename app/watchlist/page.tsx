import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { WatchlistClient } from "@/components/watchlist/WatchlistClient";

export const metadata: Metadata = {
  title: "Watchlist — TickerIO",
  description: "Your tracked symbols with live prices and intraday sparklines.",
};

export default function WatchlistPage() {
  return (
    <>
      <SiteHeader />
      <WatchlistClient />
    </>
  );
}
