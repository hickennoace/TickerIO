/** Alternative.me Crypto Fear & Greed Index — industry-standard, free, daily. */

import { z } from "zod";
import { fetchJson } from "@/lib/cache";

const schema = z.object({
  data: z.array(
    z.object({
      value: z.string(),
      value_classification: z.string(),
      timestamp: z.string(),
    }),
  ),
});

export interface CryptoFng {
  score: number;
  label: string;
  asOf: string;
}

export async function getCryptoFng(): Promise<CryptoFng> {
  const raw = await fetchJson<unknown>("https://api.alternative.me/fng/?limit=1");
  const parsed = schema.parse(raw);
  const item = parsed.data[0];
  return {
    score: Number(item.value),
    label: item.value_classification,
    asOf: new Date(Number(item.timestamp) * 1000).toISOString(),
  };
}
