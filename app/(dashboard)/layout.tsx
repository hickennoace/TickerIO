import { heebo } from "@/lib/fonts";

/**
 * Scopes Hebrew + RTL to the dashboard route group only. The global
 * <html lang="en"> (root layout) is untouched, so /, /markets, /watchlist and
 * /compare stay LTR/English. `dir`/`lang` on this wrapper flip the subtree and
 * switch screen-reader pronunciation; `--font-he` (Heebo) overrides the sans
 * stack inside `.dash-rtl` while Geist Mono keeps setting all numerals.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="he" className={`${heebo.variable} dash-rtl`}>
      {children}
    </div>
  );
}
