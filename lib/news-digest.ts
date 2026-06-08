/**
 * Plain-language news recap — a real summary of the latest headlines (not a
 * buy/sell signal). Uses Groq when GROQ_API_KEY is set for a genuine synthesized
 * summary; otherwise a transparent recap that weaves the actual headlines into a
 * readable digest. Server-only; cached by the hash of the headlines.
 */

import { fetchJson } from "@/lib/cache";

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

async function withGroq(display: string, headlines: string[]): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key || headlines.length === 0) return null;
  const prompt =
    `Summarize the following recent ${display} news headlines into a short, factual recap ` +
    `of 2-3 sentences for a general reader. Describe what is actually being reported — ` +
    `NO buy/sell signals, NO sentiment labels, NO advice, no preamble. ` +
    `Headlines:\n- ${headlines.slice(0, 5).join("\n- ")}`;
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
          max_tokens: 160,
        }),
      },
    );
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function buildNewsDigest(display: string, headlines: string[]): Promise<NewsDigest> {
  const llm = await withGroq(display, headlines);
  return llm ? { text: llm, generatedBy: "groq:llama-3.3-70b" } : recap(display, headlines);
}
