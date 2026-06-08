"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

/** Toggles the "Daylight" light theme. Initial theme is applied pre-paint by an
 *  inline script in the layout, so there's no flash. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) || "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("tickerio-theme", next);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      onClick={toggle}
      className="grid h-9 w-9 place-items-center rounded-lg border transition-colors hover:border-[var(--border-strong)]"
      style={{ borderColor: "var(--border)" }}
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      aria-label="Toggle color theme"
    >
      {theme === "dark" ? (
        <Sun size={16} style={{ color: "var(--fg-muted)" }} />
      ) : (
        <Moon size={16} style={{ color: "var(--fg-muted)" }} />
      )}
    </button>
  );
}
