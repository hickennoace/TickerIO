/**
 * Plain-language news recap — a real summary of the latest headlines (not a
 * buy/sell signal). Uses Groq when GROQ_API_KEY is set for a genuine synthesized
 * summary; otherwise a transparent recap that weaves the actual headlines into a
 * readable digest. Server-only; cached by the hash of the headlines.
 */

import { llmText } from "@/lib/ai/llm";

export interface NewsDigest {
  text: string;
  generatedBy: string;
}

/** Clean a headline for inline use (trim, drop trailing source tags). */
function tidy(h: string): string {
  return h.replace(/\s*[-|–]\s*[A-Z][\w.& ]{1,20}$/i, "").trim().replace(/\.$/, "");
}

function recap(display: string, headlines: string[]): NewsDigest {
  const hs = headlines.map(tidy).filter(Boolean).slice(0, 5);
  if (hs.length === 0) {
    return { text: "No fresh headlines to summarize yet.", generatedBy: "headline recap" };
  }
  const lead = hs[0];
  const rest = hs.slice(1);
  let text = `Here's the latest on ${display}: ${lead}.`;
  if (rest.length === 1) text += ` Also in the news: ${rest[0]}.`;
  else if (rest.length > 1) {
    text += ` Other headlines: ${rest.slice(0, -1).join("; ")}; and ${rest[rest.length - 1]}.`;
  }
  return { text, generatedBy: "headline recap" };
}

export async function buildNewsDigest(display: string, headlines: string[]): Promise<NewsDigest> {
  if (headlines.length === 0) return recap(display, headlines);
  const prompt =
    `Summarize the following recent ${display} news headlines into a short, factual recap ` +
    `of 2-3 sentences for a general reader. Describe what is actually being reported — ` +
    `NO buy/sell signals, NO sentiment labels, NO advice, no preamble. ` +
    `Headlines:\n- ${headlines.slice(0, 5).join("\n- ")}`;
  const llm = await llmText(prompt, 200);
  return llm ? { text: llm.text, generatedBy: llm.by } : recap(display, headlines);
}
