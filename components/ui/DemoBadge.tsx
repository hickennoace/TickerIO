/**
 * Honesty marker (CLAUDE.md §1.2.3): everything driven by seeded demo data
 * carries this badge until Phase 1 wires real providers.
 */
export function DemoBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{
        color: "var(--warn)",
        borderColor: "rgba(240,185,11,0.3)",
        background: "rgba(240,185,11,0.08)",
      }}
      title="Demo data — not real market values. Replaced when live providers are connected."
    >
      Demo
    </span>
  );
}
