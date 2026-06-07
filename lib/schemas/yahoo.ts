/** Zod schemas validating Yahoo Finance payloads at the boundary (CLAUDE.md §3). */

import { z } from "zod";

export const yahooQuoteMeta = z
  .object({
    currency: z.string().optional(),
    symbol: z.string(),
    exchangeName: z.string().optional(),
    fullExchangeName: z.string().optional(),
    instrumentType: z.string().optional(),
    regularMarketPrice: z.number(),
    chartPreviousClose: z.number().optional(),
    previousClose: z.number().optional(),
    regularMarketTime: z.number().optional(),
    regularMarketDayHigh: z.number().optional(),
    regularMarketDayLow: z.number().optional(),
    fiftyTwoWeekHigh: z.number().optional(),
    fiftyTwoWeekLow: z.number().optional(),
    exchangeTimezoneName: z.string().optional(),
    timezone: z.string().optional(),
    shortName: z.string().optional(),
    longName: z.string().optional(),
  })
  .passthrough();

const ohlc = z.object({
  open: z.array(z.number().nullable()).optional(),
  high: z.array(z.number().nullable()).optional(),
  low: z.array(z.number().nullable()).optional(),
  close: z.array(z.number().nullable()).optional(),
  volume: z.array(z.number().nullable()).optional(),
});

export const yahooChart = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: yahooQuoteMeta,
          timestamp: z.array(z.number()).optional(),
          indicators: z.object({
            quote: z.array(ohlc).optional(),
            adjclose: z.array(z.object({ adjclose: z.array(z.number().nullable()) })).optional(),
          }),
        }),
      )
      .nullable(),
    error: z
      .object({ code: z.string().optional(), description: z.string().optional() })
      .nullable(),
  }),
});

export type YahooChart = z.infer<typeof yahooChart>;
export type YahooQuoteMeta = z.infer<typeof yahooQuoteMeta>;
