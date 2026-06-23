/** Google Gemini text generation. Server-only. Returns null on any failure
 *  (missing key, quota/429, network) so callers can fall back gracefully. */

const MODEL = "gemini-2.5-flash";

export async function geminiText(
  prompt: string,
  maxTokens = 220,
  opts: { json?: boolean } = {},
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: maxTokens,
            // Disable "thinking" so the token budget goes to the answer, not reasoning.
            thinkingConfig: { thinkingBudget: 0 },
            ...(opts.json ? { responseMimeType: "application/json" } : {}),
          },
        }),
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}
