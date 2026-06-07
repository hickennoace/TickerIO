# CLAUDE.md — TickerIO

> **The professional trader's all-in-one dashboard.**
> Type a ticker. See the whole market truth — instantly, without a refresh.

This file is the **single source of truth** for the TickerIO project. Read it fully before writing any code. It defines the product vision, the financial correctness rules we never violate, the tech stack, the architecture, and the phased roadmap. When in doubt, this document wins.

---

## 1. Project Vision & Financial Guidelines

### 1.1 What we are building
TickerIO is a **premium, real-time financial SPA** for active traders and prop-firm-style analysts. A user enters a symbol (`AAPL`, `BTC`, `ETH`, `EURUSD`) and immediately receives a complete, professional read on the asset: live price, a TradingView-grade chart, structured timeframe performance, market psychology (Fear & Greed / FOMO), AI-summarized news & report impact, and an algorithmic trend bias — all on **one page, no reloads**.

The product must **feel expensive**. Every interaction is smooth, every widget loads gracefully, nothing janks.

### 1.2 The trading mindset (non-negotiable)
We do not build "a stock app." We build a tool that **calculates the market the way professionals actually read it.** Every number on screen must be defensible to a quant.

**Core financial principles — enforce these everywhere:**

1. **Timeframe changes are anchored, not rolling.** A "Weekly change" is measured from the **open of the current trading week**, not "price 7 days ago." Same for Day, Month, Quarter, Year, YTD. See §4 for exact math. This is the most common mistake in retail apps — we do not make it.

2. **Respect market hours and asset class.**
   - **Crypto** trades 24/7. Sessions anchor to **UTC** (daily = `00:00 UTC`, weekly = Monday `00:00 UTC`).
   - **Equities** trade in sessions (regular `09:30–16:00 ET`). "Today" means the current/most-recent **trading session**, accounting for weekends, holidays, and pre/post-market. Never treat a Saturday as a flat day.

3. **No silent data lies.** If data is stale, partial, or from a fallback source, the UI must reflect it (timestamp, "delayed," or a subtle indicator). A confidently-wrong number is worse than a labeled-uncertain one.

4. **Percentages and bases are explicit.** Always state the reference base for a % move (prev close vs. session open vs. period open). Mixing bases silently is a bug.

5. **Time zones are first-class.** Store and compute in **UTC**. Convert to the user's locale only at the presentation layer. Never compute period boundaries in local time.

6. **Decimals, not floats, for money math where precision matters.** Use integer/decimal-safe handling for cumulative calculations; avoid naive float accumulation.

7. **Sentiment is signal, not gospel.** AI/news outputs are clearly framed as *analysis*, never as financial advice. Include a standing disclaimer.

---

## 2. Tech Stack Selection (Vercel-native)

Chosen specifically to be **first-class on Vercel's serverless/edge platform** and to deliver a premium SPA feel.

| Layer | Choice | Why |
|---|---|---|
| **Framework** | **Next.js (App Router, latest)** | Native to Vercel. Server Components for fast first paint, Route Handlers for our API, streaming, edge-ready. |
| **Language** | **TypeScript (strict)** | Financial code must be type-safe. `strict: true`, no `any` in domain logic. |
| **UI** | **React 19 + Tailwind CSS + shadcn/ui** | Rapid, consistent, themeable premium UI. shadcn for accessible primitives. |
| **Animation** | **Framer Motion** | Smooth widget transitions, gauge animations, layout transitions. |
| **Charting** | **TradingView Advanced Charting Library** (official) | The non-negotiable centerpiece. Drawing tools, intervals, indicators. *(Requires license access from TradingView — see §6 Phase 2.)* |
| **Data fetching/cache** | **TanStack Query (React Query)** + SWR-style revalidation | Background refetch, stale-while-revalidate, skeletons, dedupe. |
| **State** | **Zustand** (light global) + React Query (server state) | Keep client state minimal; server state lives in Query. |
| **AI** | **Vercel AI SDK** + an LLM provider (Anthropic Claude / Groq / OpenAI) | Streaming summaries, structured output for sentiment scoring. |
| **Validation** | **Zod** | Validate every external API payload at the boundary. |
| **Dates/Math** | **date-fns-tz** (or Luxon) + custom finance utils | Session/period boundary math in UTC. |
| **Server caching** | **Vercel Runtime Cache / Upstash Redis** (Marketplace) | Cache news/AI/quote responses to respect rate limits & cost. |
| **Deployment** | **Vercel** | Functions, Edge, Cron Jobs, env management, preview deploys. |

> **Provider note:** When integrating the LLM, consult the latest model IDs/pricing before hardcoding anything. Default to a current, capable model (e.g., Claude Opus/Sonnet class) and route through the **Vercel AI SDK** so providers are swappable.

### 2.1 Trusted Data Sources (reliability is the product)

TickerIO's credibility depends entirely on where its numbers come from. We aggregate **multiple leading financial sources**, normalize them through Zod at the boundary, and always show provenance + an `asOf` timestamp. Sources are layered as **primary → fallback** so a single outage never blanks the dashboard.

| Domain | Primary source | Fallback / cross-check | Notes |
|---|---|---|---|
| **Equities — price, OHLCV, quote** | **Yahoo Finance** (`query1.finance.yahoo.com/v8/finance/chart`) | Stooq CSV | Free, no key, broad coverage (stocks/ETFs/indices). Real session data, currency, exchange tz. |
| **Crypto — price, OHLCV** | **Yahoo Finance** (`BTC-USD`, `ETH-USD`, …) | **CoinGecko** (the "crypto jungle" of coins) | CoinGecko covers the long tail of coins Yahoo lacks; used for discovery + market cap/dominance. |
| **Crypto — sentiment** | **Alternative.me Crypto Fear & Greed Index** (`api.alternative.me/fng`) | Internal composite (§5.1) | Industry-standard crypto F&G, free, daily. |
| **Forex — rates, OHLCV** | **Yahoo Finance** (`EURUSD=X`, …) | exchangerate.host | Major + minor pairs. |
| **Macro / economic calendar** | **Forex Factory** weekly calendar (via `nfs.faireconomy.media` JSON feed) | TradingEconomics (if keyed) | High-impact events, actual/forecast/previous — drives the "event risk" rail. |
| **News & headlines** | **Yahoo Finance** news (RSS `finance.yahoo.com/rss/headline?s=SYM` + quoteSummary) | GDELT / provider RSS | Per-symbol headlines feed both the NewsFeed and the AI summary. |
| **Charting** | **TradingView** — free **Advanced Real-Time Chart** embed widget now; upgrade to the licensed **Advanced Charting Library** when access is granted | — | The free embed already gives intervals, drawing tools, and indicators (Phase 2). |

**Source rules:**
- **Never trust a single source silently.** Where two sources disagree materially, prefer the primary and flag the discrepancy.
- **Attribution is mandatory.** Each widget shows which source(s) and `asOf` time produced its numbers.
- **Server-side only.** All third-party calls happen in Route Handlers (avoids CORS, hides any keys, lets us cache).
- **Cache + rate-limit respect.** Quotes ~15–30s, candles ~1–5m, news ~5–10m, calendar ~1h, crypto F&G ~1h.
- **Graceful degradation.** On a provider error, serve last-good cached data labeled "delayed/stale" rather than an empty widget.

---

## 3. Architecture & File Structure

```
tickerio/
├── app/
│   ├── layout.tsx                  # Root layout, theme provider, fonts
│   ├── page.tsx                    # Landing / search entry
│   ├── (dashboard)/
│   │   └── [ticker]/
│   │       └── page.tsx            # Main SPA dashboard for a symbol
│   ├── api/
│   │   ├── quote/route.ts          # Live quote + session anchors
│   │   ├── candles/route.ts        # OHLCV history (chart + period math)
│   │   ├── timeframes/route.ts     # Anchored period-change calculations
│   │   ├── sentiment/route.ts      # Fear & Greed / FOMO score
│   │   ├── news/route.ts           # Raw news fetch (cached)
│   │   ├── ai-summary/route.ts     # AI: news+reports → bottom-line (streaming)
│   │   ├── trend-bias/route.ts     # Algorithmic bias (tech + sentiment)
│   │   └── tv/                      # TradingView datafeed UDF endpoints
│   │       ├── config/route.ts
│   │       ├── symbols/route.ts
│   │       └── history/route.ts
│   └── globals.css
│
├── components/
│   ├── chart/
│   │   ├── TradingViewChart.tsx     # Wraps the Advanced Charting Library widget
│   │   └── datafeed.ts             # UDF/JS API datafeed adapter
│   ├── widgets/
│   │   ├── PriceHeader.tsx
│   │   ├── TimeframePanel.tsx       # Day/Week/Month/YTD anchored changes
│   │   ├── FearGreedGauge.tsx       # Animated FOMO meter
│   │   ├── AiSummaryCard.tsx        # Streaming AI bottom-line
│   │   ├── NewsFeed.tsx
│   │   └── TrendBiasIndicator.tsx
│   ├── ui/                          # shadcn primitives
│   └── skeletons/                   # Per-widget skeleton loaders
│
├── lib/
│   ├── finance/
│   │   ├── sessions.ts             # Market-hours + UTC session boundaries
│   │   ├── periods.ts              # Anchored period-open resolution
│   │   ├── change.ts               # % change calculators (explicit base)
│   │   ├── trend-bias.ts           # Bias algorithm (momentum + sentiment)
│   │   └── fear-greed.ts           # F&G composite scoring
│   ├── providers/                   # External market-data API clients
│   │   ├── marketData.ts
│   │   └── news.ts
│   ├── ai/
│   │   └── summarize.ts            # Prompt + structured-output helpers
│   ├── schemas/                     # Zod schemas for all external payloads
│   ├── cache.ts                     # Redis/Runtime cache helpers
│   └── types.ts                     # Shared domain types
│
├── store/
│   └── useDashboard.ts             # Zustand: active symbol, interval, prefs
│
├── public/
│   └── charting_library/           # TradingView lib (gitignored / per license)
│
├── vercel.json                      # Cron jobs, function config
├── CLAUDE.md                        # ← this file
└── ...config (tsconfig, tailwind, eslint, env)
```

### Data flow (high level)
```
User types ticker
   → [ticker]/page.tsx mounts, sets symbol in Zustand
   → React Query fires parallel queries:
        /api/quote        → PriceHeader
        /api/candles      → TradingViewChart + TimeframePanel
        /api/timeframes   → TimeframePanel
        /api/sentiment    → FearGreedGauge
        /api/news         → NewsFeed
        /api/ai-summary   → AiSummaryCard (streamed)
        /api/trend-bias   → TrendBiasIndicator
   → Each widget shows a skeleton until its query resolves
   → Background revalidation keeps everything live, no page refresh
```

### Architectural rules
- **Domain math lives in `lib/finance/` and is pure + unit-tested.** No React, no fetch, no time-zone surprises inside these functions.
- **API routes are thin.** Validate input → call provider/finance lib → cache → return typed JSON.
- **Every external response is parsed through a Zod schema** before it touches domain logic.
- **Secrets only on the server.** Market-data and AI keys live in Vercel env vars and are never shipped to the client.
- **Cache aggressively, label honestly.** Respect provider rate limits via Redis/Runtime Cache; attach `asOf` timestamps to payloads.

---

## 4. Financial Timeframe Logic (the heart of TickerIO)

This is where we beat retail apps. **Implement in `lib/finance/periods.ts` + `change.ts`.**

### 4.1 Definitions
For each period, we resolve a **period-open anchor** and compare the **current price** against the **open price at that anchor**.

```
periodChange% = (currentPrice − periodOpenPrice) / periodOpenPrice × 100
```

### 4.2 Anchor resolution rules

| Period | Crypto (24/7, UTC) | Equities (session-based, ET → UTC) |
|---|---|---|
| **Day** | Open at `today 00:00 UTC` | Open of current/most-recent **trading session** (regular open, e.g. 09:30 ET) |
| **Week** | Open at **Monday 00:00 UTC** of current week | Open of the **first trading day** of the current week (skip holidays) |
| **Month** | Open at `1st of month 00:00 UTC` | Open of the **first trading session** of the month |
| **Quarter** | Open at first day of quarter 00:00 UTC | First trading session of the quarter |
| **YTD** | Open at `Jan 1 00:00 UTC` | First trading session of the year |
| **Year (rolling)** | Open 365d ago at session anchor | Session open ~1Y ago |

### 4.3 Hard rules
- **NEVER** implement "weekly" as `now − 7 days`. That is a rolling lookback and is **wrong** for this product.
- Weekend/holiday aware for equities — use a market calendar (e.g., holiday list per exchange). A change requested "today" on a Sunday for `AAPL` references **Friday's** session appropriately.
- All boundary computation happens in **UTC**; convert to ET (with DST handling) for equity sessions, then back to UTC for candle lookup.
- The **open price** is the open of the anchor candle, not the close of the prior candle — be explicit and consistent. Document the chosen base in code comments.
- Provide both the **% change** and the **absolute change**, plus the **anchor timestamp** so the UI can show "since Mon 00:00 UTC."

### 4.4 Acceptance tests (must pass)
- BTC on a Wednesday → weekly anchor is **this Monday 00:00 UTC**, not last Wednesday.
- AAPL on a Monday holiday → "weekly"/"daily" anchors to the correct prior/next **trading** session.
- DST transition week computes equity session opens correctly.
- YTD on Jan 1 returns ~0% (current vs. year-open), never NaN.

---

## 5. AI & Sentiment Engine

### 5.1 Fear & Greed / FOMO Meter (`lib/finance/fear-greed.ts`)
A composite 0–100 score (0 = Extreme Fear, 100 = Extreme Greed), rendered as an **animated gauge**.

Composite inputs (weight & availability per asset class):
- **Momentum** — price vs. anchored moving averages.
- **Volatility** — recent realized vol vs. baseline (high vol → fear).
- **Volume/strength** — up-volume vs. down-volume.
- **For crypto** — optionally blend an external crypto Fear & Greed source.
- **News sentiment** — feed from the AI summary (§5.2).

Output a normalized score + the sub-scores so the gauge tooltip can explain *why*.

### 5.2 AI News & Reports Impact (`/api/ai-summary`, `lib/ai/summarize.ts`)
- **Background fetch** latest news + financial reports/filings for the symbol (cached, rate-limited).
- Pass to LLM via **Vercel AI SDK** with a strict prompt: produce a **bottom-line summary** (2–4 sentences), a **sentiment label** (Bearish / Neutral / Bullish), and a **confidence**.
- Prefer **structured output** (Zod-validated) so the score feeds the Trend Bias and F&G inputs deterministically.
- **Stream** the human-readable summary to `AiSummaryCard` for a premium live-typing feel.
- Always cache by `(symbol, news-hash)` to avoid re-paying for identical inputs.
- Standing disclaimer: *"AI-generated analysis, not financial advice."*

### 5.3 Trend Bias (`lib/finance/trend-bias.ts`)
An algorithmic indicator combining **technical momentum** + **fundamental/news sentiment** into a single bias:
```
biasScore = wTech × technicalMomentum + wSent × newsSentiment
→ map to: Strong Bearish | Bearish | Neutral | Bullish | Strong Bullish
```
- `technicalMomentum`: derived from anchored MAs, ROC, and higher-high/higher-low structure.
- `newsSentiment`: from §5.2 structured output.
- Expose the component scores so the UI can show the breakdown. Document weights and keep them tunable via config.

---

## 6. Step-by-Step ROADMAP

Build in phases. **Do not start a phase until the previous one is green.** Each phase ends with a working, deployable state on a Vercel preview. Checkboxes are ticked as they ship.

### Phase 0 — Foundation & Setup ✅ DONE
- [x] `create-next-app` (App Router, TypeScript strict, Tailwind v4, ESLint).
- [x] Install Framer Motion (`motion`), lucide-react; later TanStack Query, Zod, date-fns-tz.
- [x] Dark-first premium design system, fonts, global layout, glass panels, shimmer skeletons.
- [x] `.env.example` with the env var schema.
- [x] Repo linked to GitHub; ready for Vercel import.
- [x] Landing page + `/[ticker]` dashboard shell with all widget placeholders (demo data, badged).
- ✅ *Done.*

### Phase 1 — Real Data Layer (Yahoo Finance + multi-source) 🎯
- [ ] `lib/providers/yahoo.ts` — chart/quote client (`v8/finance/chart`, `quoteSummary`), Zod-validated.
- [ ] `lib/markets/symbol.ts` — symbol resolver: `BTC`→`BTC-USD`, `EURUSD`→`EURUSD=X`, equity passthrough; asset-class + currency + exchange-tz detection.
- [ ] `lib/providers/coingecko.ts` — crypto long-tail + market cap/dominance (fallback/discovery).
- [ ] Zod schemas in `lib/schemas/` for every external payload.
- [ ] `lib/cache.ts` — in-memory + (optional) Upstash Redis TTL cache with `asOf` stamping.
- [ ] `/api/quote` and `/api/candles` Route Handlers (typed, cached, source-attributed).
- [ ] React Query provider + hooks; wire `PriceHeader` to live data with skeleton→data.
- ✅ *Done when:* a real ticker shows real price/sparkline with source + `asOf`, skeletons on load.

### Phase 2 — Charting (TradingView) 📈
- [ ] `TradingViewChart.tsx` — embed the **free Advanced Real-Time Chart widget** (intervals, drawing tools, indicators) mapped to the resolved symbol/exchange.
- [ ] Interval state synced with the rest of the dashboard.
- [ ] Theming to match the dark design system; graceful loading state.
- [ ] *(Later)* swap to the licensed **Advanced Charting Library** + `/api/tv/*` UDF datafeed when access is granted.
- ✅ *Done when:* a real, interactive TradingView chart renders for the symbol, no page reload.

### Phase 3 — Financial Math Engine (anchored timeframes) 🧮
- [ ] `lib/finance/sessions.ts` — UTC + equity market hours, weekend/holiday, DST (date-fns-tz).
- [ ] `lib/finance/periods.ts` — anchored period-open resolution for Day/Week/Month/Quarter/YTD/Year (§4), per asset class.
- [ ] `lib/finance/change.ts` — explicit-base % + absolute change calculators.
- [ ] Unit tests against §4.4 acceptance cases (Vitest).
- [ ] `/api/timeframes` + wire `TimeframePanel` to real anchored numbers with visible anchors.
- ✅ *Done when:* Day/Week/Month/YTD are correctly anchored (not rolling) for crypto AND equities.

### Phase 4 — Sentiment, News & AI Engine 🧠
- [ ] `/api/news` — Yahoo Finance per-symbol headlines (RSS + quoteSummary), cached; wire `NewsFeed`.
- [ ] `lib/finance/fear-greed.ts` + `/api/sentiment` — Alternative.me crypto F&G + internal composite (momentum/vol/strength); animated gauge.
- [ ] `lib/finance/trend-bias.ts` + `/api/trend-bias` — technical momentum × news sentiment, with breakdown.
- [ ] `/api/ai-summary` — Vercel AI SDK streaming bottom-line + structured sentiment; **heuristic fallback when no API key** (clearly labeled). Standing "not financial advice" disclaimer.
- [ ] `/api/calendar` — **Forex Factory** weekly economic calendar (faireconomy JSON); high-impact event-risk rail.
- ✅ *Done when:* sentiment column, news, AI summary, and the macro calendar all populate from real sources.

### Phase 5 — Premium UI/UX & Unique Animations ✨
- [ ] Animated gradient/mesh hero background; aurora glow that reacts to bias (green/red tint).
- [ ] Number **count-up / live-tick** animation on price + percentages (motion springs).
- [ ] **Sparkline draw-on** + chart reveal; staggered widget entrance (layout + presence).
- [ ] Animated Fear & Greed needle, trend-bias bar fills, and a live "pulse" market-status dot.
- [ ] Smooth symbol/interval transitions (no full refresh), shared-layout header.
- [ ] Per-widget skeletons everywhere; zero layout shift; full `prefers-reduced-motion` support.
- [ ] Responsive: desktop-first trading-terminal grid, graceful tablet/mobile.
- [ ] Accessibility pass (keyboard, focus rings, contrast, ARIA on gauges/charts).
- ✅ *Done when:* the app feels high-end, animations are distinctive, and nothing janks.

### Phase 6 — Reliability, Caching & Production Hardening 🛡️
- [ ] Multi-source fallback wiring (primary → fallback) with discrepancy flagging.
- [ ] Error/empty/stale states for every widget; last-good cache served on provider failure.
- [ ] Rate-limit handling + per-source TTL tuning; optional Upstash Redis via Marketplace.
- [ ] Route Handler runtime/region config in `vercel.json`; Cron for calendar/news prefetch.
- [ ] Performance: Core Web Vitals, bundle trim, font/image optimization, streaming where useful.
- [ ] Final disclaimers, source attributions, legal, env review.
- ✅ *Done when:* production is fast, resilient under provider outages, and financially correct at the edges.

### Phase 7 — Pro Features (stretch) 🚀
- [ ] Multi-symbol watchlist + compare; persistent via localStorage/Zustand.
- [ ] Symbol search autocomplete (Yahoo/CoinGecko search endpoints).
- [ ] Keyboard command palette (⌘K) for instant symbol jumps.
- [ ] Shareable deep links + OG image generation per ticker.
- ✅ *Done when:* power users can move through markets without touching the mouse.

---

## 7. Coding Guidelines (apply on every change)

- **TypeScript strict, no `any`** in `lib/finance/` or `lib/ai/`.
- **Pure, tested finance functions** — domain math never reaches for the network or the clock implicitly (inject `now`).
- **Validate at the boundary** with Zod; never trust external payloads.
- **UTC for computation, locale for display.** No business logic in local time.
- **Secrets server-side only.** No data-provider/AI keys in client bundles.
- **Cache by default**, label staleness, attach `asOf`.
- **No financial advice claims** — analysis only, with disclaimers.
- **Match the surrounding code** — naming, structure, comment density.
- **Each widget owns its loading/error/empty state.**
- **Commit small, deployable increments**; keep `main` preview-green.

---

## 8. Definition of Done (product-level)
A feature is done when: it's type-safe, the finance math passes its acceptance tests, external payloads are Zod-validated, it caches & labels staleness, it has skeleton/error/empty states, it animates smoothly, no `any` leaked into domain code, and it deploys clean to a Vercel preview.

> **Remember:** TickerIO's edge is *correctness with polish*. Anchored timeframes, honest data, and a premium feel — every single time.
