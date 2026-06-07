"use client";

import { Command } from "lucide-react";

/** Opens the global command palette by dispatching its ⌘K shortcut. */
export function CommandHint() {
  return (
    <button
      onClick={() =>
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
      }
      className="hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)] sm:flex"
      style={{ borderColor: "var(--border)" }}
      title="Quick search (Ctrl/⌘ K)"
    >
      <Command size={13} />
      <span>K</span>
    </button>
  );
}
