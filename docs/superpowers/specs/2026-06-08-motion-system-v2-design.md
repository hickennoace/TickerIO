# Motion System v2 — Design

**Date:** 2026-06-08
**Status:** Approved → implemented
**Scope:** Use Framer Motion (`motion` v12) to make TickerIO more distinctive and
delightful, at a **refined & premium** intensity, across all four areas the user
selected: the Leaders board, page transitions, dashboard widgets, and
micro-interactions throughout.

## Goal

TickerIO already has a perf-conscious motion layer (bias-tinted living
background, marquee tape, count-up numbers, reveal-on-mount, live pulse,
sparkline draw-on). This phase layers on a **coherent, reusable motion
vocabulary** and fills the biggest gap — the new `/markets` Leaders board, which
shipped with zero animation — while keeping the "Obsidian Terminal" feel.

## Non-negotiable guardrails

- **Transform/opacity only** — GPU-composited, 60fps. No `filter: blur`
  animations, no layout-thrashing properties.
- **`useReducedMotion` everywhere** — every entrance/loop/icon-swap collapses to
  instant or no-transform when the user prefers reduced motion.
- **Never animate over the TradingView chart** or fight the dnd-kit drag.
- **No bundle bloat** — `motion` is already a dependency.

## Architecture

### Shared vocabulary — `lib/motion.ts`
Single source of truth: `EASE` (house ease-out `[0.22,1,0.36,1]`), `DURATION`
(`fast/base/slow`), `SPRING` (`soft/snappy`), and variants `fadeUp`, `scaleIn`,
`staggerContainer(stagger, delay)`. Every animation pulls from these so timing
and feel are consistent.

### 1. Page transitions — `app/template.tsx`
`template.tsx` remounts per navigation; wraps page content in a soft fade + 8px
rise (`DURATION.base`). Reduced-motion returns children unwrapped.

### 2. Leaders board (`/markets`)
- **`MarketsClient`** — animated tab bar: the active accent pill glides between
  tabs via shared layout (`layoutId="markets-tab-pill"`); tab content cross-fades
  with `AnimatePresence mode="wait"`. Commodities groups stagger in.
- **`SectorBoard`** — tiles stagger in; `layout` prop reflows them smoothly when
  they re-sort strongest-first as data lands; `whileHover` lift + `whileTap`;
  the % value count-ups via `AnimatedNumber`; the drilldown heading swaps with a
  horizontal `AnimatePresence` slide.
- **`RankedQuotes`** — rows stagger in (`staggerContainer`); each rank bar grows
  from 0 to its width.

### 3. Dashboard widgets — `WidgetCard`
Converted to a client `motion.section` with a restrained `whileHover` lift
(`y:-3`, `SPRING.soft`). ChartPanel does not use WidgetCard, so the heavy iframe
is untouched. Left-column reveal staggering already existed (`Reveal`).

### 4. Micro-interactions
- **`SymbolAutocomplete` + `TickerSearch`** dropdowns animate in/out with
  `scaleIn` under `AnimatePresence`; suggestion chips + Analyze button get
  hover/press feedback.
- **`CompareClient`** chips animate in/out and reflow with `AnimatePresence
  mode="popLayout"` + `layout`; the overlay period selector gets a sliding pill
  (`layoutId="compare-period-pill"`).
- **`ThemeToggle`** swaps the sun/moon icon with a spin+scale crossfade and adds
  press feedback.
- **`MarketOverview`** bellwether + watchlist grids stagger in.

## Testing / Definition of Done
- `tsc --noEmit` clean, `next build` green (the only lint errors are
  pre-existing `set-state-in-effect` patterns unrelated to this work).
- Runtime: `/`, `/markets`, `/compare`, `/[ticker]` all return 200.
- Visual: motion is smooth, nothing janks, reduced-motion disables it.
- Deployed to production on Vercel.
