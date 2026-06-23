import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { WatchlistClient } from "@/components/watchlist/WatchlistClient";

export const metadata: Metadata = {
  title: "רשימת מעקב — TickerIO",
  description: "הסמלים שאתם עוקבים אחריהם, עם מחירים בזמן אמת וגרפי מיני תוך-יומיים.",
};

export default function WatchlistPage() {
  return (
    <>
      <SiteHeader />
      <WatchlistClient />
    </>
  );
}
