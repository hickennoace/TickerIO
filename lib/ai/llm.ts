/**
 * LLM provider chain. Tries Gemini first (primary), then Groq, and returns null
 * if neither is configured/available so callers fall back to a heuristic.
 */

import { geminiText } from "./gemini";
import { groqText } from "./groq";

export interface LlmResult {
  text: string;
  by: string;
}

export async function llmText(prompt: string, maxTokens = 220): Promise<LlmResult | null> {
  const g = await geminiText(prompt, maxTokens);
  if (g) return { text: g, by: "gemini-2.5-flash" };
  const q = await groqText(prompt, maxTokens);
  if (q) return { text: q, by: "groq:llama-3.3-70b" };
  return null;
}
