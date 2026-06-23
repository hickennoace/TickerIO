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

/**
 * Strip ```json fences / surrounding prose and parse the first JSON object.
 * Tolerates truncation (model hit the token cap mid-string) by best-effort
 * closing an open string + unbalanced braces, so a partial answer still yields
 * the fields that did come through rather than collapsing to null.
 */
function parseJson<T>(raw: string): T | null {
  const tryParse = (s: string): T | null => {
    try {
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  };

  const direct = tryParse(raw);
  if (direct) return direct;

  const start = raw.indexOf("{");
  if (start === -1) return null;
  const body = raw.slice(start);

  const end = body.lastIndexOf("}");
  if (end > 0) {
    const sliced = tryParse(body.slice(0, end + 1));
    if (sliced) return sliced;
  }

  // Best-effort repair of a truncated object: close an open string, then braces.
  let repaired = body.replace(/,\s*$/, "");
  const unescapedQuotes = (repaired.match(/(?<!\\)"/g) ?? []).length;
  if (unescapedQuotes % 2 === 1) repaired += '"';
  const opens = (repaired.match(/{/g) ?? []).length;
  const closes = (repaired.match(/}/g) ?? []).length;
  repaired += "}".repeat(Math.max(0, opens - closes));
  return tryParse(repaired);
}

/**
 * Ask the LLM for a JSON object and parse it. Uses each provider's native JSON
 * mode. Returns the parsed value + which model produced it, or null.
 */
export async function llmJson<T>(
  prompt: string,
  maxTokens = 700,
): Promise<{ value: T; by: string } | null> {
  const g = await geminiText(prompt, maxTokens, { json: true });
  if (g) {
    const v = parseJson<T>(g);
    if (v) return { value: v, by: "gemini-2.5-flash" };
  }
  const q = await groqText(prompt, maxTokens, { json: true });
  if (q) {
    const v = parseJson<T>(q);
    if (v) return { value: v, by: "groq:llama-3.3-70b" };
  }
  return null;
}
