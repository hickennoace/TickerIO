/**
 * Centralized next/font objects. Imported by the root layout (Latin pages) and
 * the dashboard layout (which additionally loads the Hebrew face).
 */

import { Geist, Geist_Mono, Bricolage_Grotesque, Heebo } from "next/font/google";

export const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
export const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

/**
 * Hebrew face — pairs with Geist's neutral grotesque idiom. Scoped to the
 * dashboard subtree via `--font-he`; numerals stay Geist Mono. `latin` subset is
 * included so mixed strings (tickers, %) don't fall back to a system face.
 */
export const heebo = Heebo({
  variable: "--font-he",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
