import type { Metadata, Viewport } from "next";
import "./globals.css";
import { geistSans, geistMono, display, heebo } from "@/lib/fonts";
import { Providers } from "./providers";
import { CommandPalette } from "@/components/CommandPalette";
import { SiteBackground } from "@/components/SiteBackground";
import { AlertWatcher } from "@/components/AlertWatcher";

export const metadata: Metadata = {
  metadataBase: new URL("https://ticker-io.vercel.app"),
  title: "TickerIO — ניתוח פונדמנטלי לכל נייר ערך",
  description:
    "הקלד טיקר וקבל ניתוח מלא בעברית: דוחות, הערכת שווי, תזרים, מגמות רב-שנתיות, שווי הוגן, ניתוח חדשות וגרף חי — למניות, קריפטו ומט\"ח.",
  applicationName: "TickerIO",
  openGraph: {
    title: "TickerIO",
    description: "ניתוח פונדמנטלי בעברית לכל נייר ערך — דוחות, שווי הוגן, מגמות וחדשות.",
    type: "website",
    locale: "he_IL",
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
      lang="he"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${heebo.variable} h-full antialiased`}
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
