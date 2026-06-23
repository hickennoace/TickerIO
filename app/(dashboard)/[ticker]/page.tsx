import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const symbol = decodeURIComponent(ticker).toUpperCase();
  return { title: `${symbol} — ניתוח פונדמנטלי | TickerIO` };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const symbol = decodeURIComponent(ticker).toUpperCase();

  return (
    <>
      <SiteHeader />
      <DashboardClient symbol={symbol} />
    </>
  );
}
