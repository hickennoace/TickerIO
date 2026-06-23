import type { Metadata, Viewport } from "next";
import "./globals.css";
import { geistSans, geistMono, display } from "@/lib/fonts";
import { Providers } from "./providers";
import { CommandPalette } from "@/components/CommandPalette";
import { SiteBackground } from "@/components/SiteBackground";
import { AlertWatcher } from "@/components/AlertWatcher";

export const metadata: Metadata = {
  metadataBase: new URL("https://ticker-io.vercel.app"),
  title: "TickerIO — The trader's all-in-one dashboard",
  description:
    "Type a ticker. Get a complete, real-time read on any asset — TradingView-grade charts, anchored timeframes, AI sentiment, and trend bias. No refresh.",
  applicationName: "TickerIO",
  openGraph: {
    title: "TickerIO",
    description: "The professional trader's all-in-one financial dashboard.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('tickerio-theme')==='light'){document.documentElement.dataset.theme='light'}}catch(e){}",
          }}
        />
        <SiteBackground />
        <Providers>
          {children}
          <CommandPalette />
          <AlertWatcher />
        </Providers>
      </body>
    </html>
  );
}
