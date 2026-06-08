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

### Phase 1 — Real Data Layer (Yahoo Finance + multi-source) ✅ DONE
- [x] `lib/providers/yahoo.ts` — chart/quote client (`v8/finance/chart`), dual-host, Zod-validated.
- [x] `lib/markets/symbol.ts` — symbol resolver: `BTC`→`BTC-USD`, `EURUSD`→`EURUSD=X`, indices, equity passthrough; asset-class + reference-tz detection.
- [ ] `lib/providers/coingecko.ts` — crypto long-tail + market cap/dominance. *(Deferred to Phase 7; Yahoo covers major coins.)*
- [x] Zod schemas in `lib/schemas/` for the Yahoo payload.
- [x] `lib/cache.ts` — in-memory TTL cache with last-good fallback + `asOf` stamping. *(Upstash optional, Phase 6.)*
- [x] `/api/quote` and `/api/candles` Route Handlers (typed, cached, source-attributed).
- [x] React Query provider + hooks; `PriceHeader` wired to live data with skeleton→data.
- ✅ *Verified:* AAPL/BTC/EURUSD return real price/sparkline with source + `asOf`.

### Phase 2 — Charting (TradingView) ✅ DONE
- [x] `TradingViewChart.tsx` — free Advanced Real-Time Chart widget (intervals, drawing tools, Volume study), symbol/exchange-mapped.
- [x] Interval switcher synced to the chart.
- [x] Dark theme matched; graceful load + error fallback.
- [ ] *(Later)* swap to the licensed **Advanced Charting Library** + `/api/tv/*` UDF datafeed when access is granted.
- ✅ *Verified:* interactive TradingView chart renders per symbol, no page reload.

### Phase 3 — Financial Math Engine (anchored timeframes) ✅ DONE
- [x] `lib/finance/sessions.ts` — reference-tz zoned bucketing, ISO-week, DST-safe (date-fns-tz).
- [x] `lib/finance/periods.ts` — anchored period-open resolution for Day/Week/Month/Quarter/YTD/1Y (§4), per asset class.
- [x] `lib/finance/change.ts` — explicit-base % + absolute change calculators.
- [ ] Vitest unit suite for §4.4. *(Validated live instead; formal tests deferred.)*
- [x] `/api/timeframes` + `TimeframePanel` wired to real anchored numbers with visible UTC anchors.
- ✅ *Verified:* AAPL Day anchors to 13:30 UTC session open, Week to Monday's open — not rolling.

### Phase 4 — Sentiment, News & AI Engine ✅ DONE
- [x] `/api/news` — Yahoo Finance per-symbol RSS headlines, cached, real links; `NewsFeed` wired.
- [x] `lib/finance/fear-greed.ts` + `/api/sentiment` — internal composite (momentum/strength/vol) blended with Alternative.me crypto F&G; animated gauge.
- [x] `lib/finance/trend-bias.ts` + `/api/trend-bias` — technical momentum × sentiment, with breakdown bars.
- [x] `/api/ai-summary` — bottom-line + structured sentiment; **Groq LLM when `GROQ_API_KEY` set, heuristic fallback otherwise** (labeled). "Not financial advice" disclaimer.
- [x] `/api/calendar` — **Forex Factory** weekly economic calendar (faireconomy JSON); Event-Risk widget.
- ✅ *Verified:* sentiment, news (10 live), AI summary, and calendar (18 live events) all populate from real sources.

### Phase 5 — Premium UI/UX & Unique Animations ✅ DONE
- [x] Animated aurora-mesh background that tints to market bias (green/red/blue).
- [x] Spring count-up / live-tick on the price (`AnimatedNumber`).
- [x] Sparkline draw-on (pathLength) + staggered widget entrance (`Reveal`).
- [x] Animated Fear & Greed needle, trend-bias bar fills, live "pulse" market-status dot.
- [x] Symbol/interval changes update in place (React Query, no full refresh).
- [x] Per-widget skeletons everywhere; minimal layout shift.
- [x] Responsive desktop-first trading-terminal grid.
- [ ] Deep accessibility pass (ARIA on gauges/chart). *(Baseline done; full audit Phase 6+.)*
- ✅ *Verified:* distinctive animations across hero, widgets, and gauges; nothing janks in build.

### Phase 6 — Reliability, Caching & Production Hardening 🛡️ (in progress)
- [x] Yahoo dual-host fallback; last-good cache served on provider failure; news/calendar degrade to empty, never crash.
- [x] Error/empty/stale states for every widget; "delayed" badge when cache is stale.
- [x] Per-source TTL tuning (quote 20s, candles 60s, daily 5m, news 10m, calendar/F&G 1h).
- [ ] `vercel.json` runtime/region config + Cron prefetch; optional Upstash Redis.
- [ ] Formal Core Web Vitals / bundle audit.
- [x] Source attributions + "not financial advice" disclaimers throughout.
- 🔶 *Status:* resilient and correct; platform-level tuning (Cron/Redis/CWV audit) remains optional.

### Phase 7 — Pro Features 🚀 (mostly done)
- [x] Watchlist persistent via Zustand + localStorage (star toggle + landing strip + palette).
- [x] Symbol search autocomplete (Yahoo search) — keyboard-navigable dropdown.
- [x] Keyboard command palette (⌘/Ctrl-K) for instant symbol jumps + watchlist.
- [x] Shareable deep links (every `/[ticker]` is a URL) + per-ticker OG image (next/og).
- [x] Multi-symbol **compare** view (`/compare?symbols=…`) — normalized overlay + table.
- ✅ *Done:* full roadmap shipped; power users can move through markets via ⌘K without the mouse.

> **SEO/finish also shipped:** robots.txt, sitemap.xml, branded favicon (`app/icon.tsx`),
> custom 404 + error boundary, dashboard loading skeleton, `metadataBase`.
>
> **Deploy note:** Vercel's Production Branch is still `master` (stale from import), so `main`
> pushes currently create Previews — production is updated via `vercel deploy` + `vercel promote`.
> Fix once in dashboard: Settings → Git → Production Branch → `main`.

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
