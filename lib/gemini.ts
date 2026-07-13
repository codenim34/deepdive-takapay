// Shared helper for the two in-app Gemini call sites (brand analytics
// overview, review-queue suggestions). Both are manual-trigger, server-side
// only (Node runtime, needs GEMINI_API_KEY), and parse a JSON response —
// this centralizes that instead of duplicating fetch/parse logic.
const MODEL = "gemini-3.1-flash-lite";

export class GeminiError extends Error {}

export async function callGemini(apiKey: string, prompt: string, systemInstruction?: string): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new GeminiError(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiError("Unexpected Gemini response shape");
  }

  return JSON.parse(text);
}
