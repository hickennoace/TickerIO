/**
 * Per-article context summary — explains the substance *behind* a headline, not
 * a restatement of the title. Feeds the LLM the article body (best-effort) plus
 * the feed excerpt; without an LLM key it falls back to the real excerpt itself
 * (which is the lead/context, not the title). Server-only.
 */

import { llmText } from "@/lib/ai/llm";
import { fetchArticleText } from "@/lib/providers/article";

export interface ArticleSummary {
  summary: string;
  generatedBy: string;
}

/** Trim an excerpt to its first 1–2 sentences for the no-LLM fallback. */
function leadSentences(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const m = clean.match(/^.*?[.!?](?:\s+.*?[.!?])?/);
  return (m ? m[0] : clean).slice(0, 320).trim();
}

export async function summarizeArticle(
  symbol: string,
  headline: string,
  description: string,
  url: string,
): Promise<ArticleSummary> {
  const body = await fetchArticleText(url);
  // Prefer the full body; the feed excerpt is the reliable backup context.
  const context = (body.length > description.length ? body : description).trim();

  if (!context) {
    return {
      summary: "No additional context is available for this story yet.",
      generatedBy: "no source text",
    };
  }

  const prompt =
    `You are explaining a ${symbol} news story to a reader who has only seen the headline. ` +
    `In 2-3 sentences, explain the substance and context BEHIND it: what is actually happening, ` +
    `the key facts, and why it matters. Do NOT simply restate the headline, and give no buy/sell ` +
    `advice or sentiment labels. No preamble.\n\n` +
    `Headline: ${headline}\n\nArticle:\n${context.slice(0, 2400)}`;

  const llm = await llmText(prompt, 220);
  if (llm) return { summary: llm.text, generatedBy: llm.by };

  // No LLM available → the article's own lead is the honest "context behind it".
  return { summary: leadSentences(context), generatedBy: "article excerpt" };
}
