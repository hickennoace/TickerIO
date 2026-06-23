"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold tracking-tight">משהו השתבש</h1>
      <p className="mt-3 max-w-md text-[var(--fg-muted)]">
        אחד הווידג&apos;טים נתקל בשגיאה בלתי צפויה. ספקי נתוני השוק עלולים להיות לא יציבים — נסו שוב.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <RotateCcw size={16} /> נסה שוב
        </button>
        <Link
          href="/"
          className="rounded-xl border px-5 py-2.5 text-sm font-semibold text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
          style={{ borderColor: "var(--border)" }}
        >
          דף הבית
        </Link>
      </div>
    </main>
  );
}
