/**
 * Plain-language news digest — "what do these headlines actually mean?"
 *
 * Uses Groq when GROQ_API_KEY is set, otherwise a transparent keyword-based
 * heuristic. Server-only. Kept deterministic-ish so it can be cached by the
 * hash of the headlines (no repeat LLM calls for identical news).
 */

import { fetchJson } from "@/lib/cache";

const BULL = /\b(rall|surg|gain|beat|jump|soar|record|upgrade|buy|rise|rose|rip|strong|win|top|optimis|boom|bullish|rebound|recover)/i;
const BEAR = /\b(fall|plung|drop|cut|downgrade|slump|warn|sell|crash|fear|weak|loss|miss|sink|tumbl|slide|bearish|fraud|probe|lawsuit|halt)/i;

export interface NewsDigest {
  text: string;
  lean: "positive" | "negative" | "mixed";
  generatedBy: string;
}

function heuristic(display: string, headlines: string[]): NewsDigest {
  if (headlines.length === 0) {
    return { text: "No fresh headlines to summarize yet.", lean: "mixed", generatedBy: "heuristic" };
  }
  let score = 0;
  for (const h of headlines) {
    if (BULL.test(h)) score += 1;
    if (BEAR.test(h)) score -= 1;
  }
  const lean = score > 0 ? "positive" : score < 0 ? "negative" : "mixed";
  const implication =
    lean === "positive"
      ? "the coverage skews upbeat, which traders often read as supportive for the price — though headlines are never guarantees."
      : lean === "negative"
      ? "the coverage skews negative, which the market often treats as a caution flag to watch closely."
      : "the coverage is mixed, so there's no single clear story driving sentiment right now.";
  return {
    text: `In plain English: across the latest ${headlines.length} ${display} stories, ${implication}`,
    lean,
    generatedBy: "heuristic",
  };
}

async function withGroq(display: string, headlines: string[]): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key || headlines.length === 0) return null;
  const prompt =
    `Explain, in ONE or TWO simple sentences for a complete beginner with no finance background, ` +
    `what these recent ${display} news headlines collectively mean and why they might matter. ` +
    `Use plain everyday language, no jargon, no preamble. Headlines:\n- ${headlines.join("\n- ")}`;
  try {
    const data = await fetchJson<{ choices: { message: { content: string } }[] }>(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 120,
        }),
      },
    );
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function buildNewsDigest(display: string, headlines: string[]): Promise<NewsDigest> {
  const base = heuristic(display, headlines);
  const llm = await withGroq(display, headlines);
  return llm ? { text: llm, lean: base.lean, generatedBy: "groq:llama-3.3-70b" } : base;
}
