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

const UNAVAILABLE: ArticleSummary = {
  summary: "No additional context is available for this story yet.",
  generatedBy: "unavailable",
};

/** Trim an excerpt to its first 1–2 sentences for the no-LLM fallback. */
function leadSentences(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const m = clean.match(/^.*?[.!?](?:\s+.*?[.!?])?/);
  return (m ? m[0] : clean).slice(0, 320).trim();
}

/** Real prose, not a one-word fragment or page chrome ("Accessibility ."). */
function isMeaningful(text: string): boolean {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length < 50) return false;
  return clean.split(/\s+/).filter(Boolean).length >= 9;
}

export async function summarizeArticle(
  symbol: string,
  headline: string,
  description: string,
  url: string,
): Promise<ArticleSummary> {
  const body = (await fetchArticleText(url)).trim();
  const desc = description.replace(/\s+/g, " ").trim();
  // Prefer a substantial scraped body; otherwise the (cleaner) feed excerpt.
  // fetchArticleText already returns "" for consent walls / page chrome.
  const context = body.length >= 180 ? body : desc;

  if (!isMeaningful(context)) return UNAVAILABLE;

  const prompt =
    `You are explaining a ${symbol} news story to a reader who has only seen the headline. ` +
    `In 2-3 sentences, explain the substance and context BEHIND it: what is actually happening, ` +
    `the key facts, and why it matters. Do NOT simply restate the headline, and give no buy/sell ` +
    `advice or sentiment labels. No preamble.\n\n` +
    `Headline: ${headline}\n\nArticle:\n${context.slice(0, 2400)}`;

  const llm = await llmText(prompt, 240);
  if (llm && isMeaningful(llm.text)) return { summary: llm.text, generatedBy: llm.by };

  // No LLM → the article's own lead is the honest "context behind it", but only
  // if it reads as real prose. Never surface a one-word chrome fragment.
  const lead = leadSentences(context);
  if (isMeaningful(lead)) return { summary: lead, generatedBy: "article excerpt" };
  return UNAVAILABLE;
}
