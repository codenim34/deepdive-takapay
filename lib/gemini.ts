// Shared helper for the in-app Gemini call sites. All of them are
// manual-trigger, server-side only (Node runtime, needs an API key), and
// parse a JSON response — this centralizes that instead of duplicating
// fetch/parse logic.
//
// Everything the upstream provider controls (model id, API base URL, key
// name, how long we are willing to wait) is resolved from the environment at
// call time rather than compiled in. Google retires Gemini model ids on a
// rolling basis and has renamed the conventional key variable more than
// once; when that happens next, this app is a redeploy with a changed
// environment variable, not a code change and release.

/** Model used when GEMINI_MODEL is not set. */
export const DEFAULT_MODEL = "gemini-3.1-flash-lite";

/** Base URL used when GEMINI_API_BASE is not set. */
export const DEFAULT_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Wall-clock budget for a single upstream call when GEMINI_TIMEOUT_MS is not set. */
export const DEFAULT_TIMEOUT_MS = 20_000;

export class GeminiError extends Error {}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  apiBase: string;
  timeoutMs: number;
}

/**
 * Read Gemini settings out of the environment.
 *
 * Returns null when no API key is configured, which is a supported state:
 * the dashboard is fully functional without Gemini and only the Brand
 * Assistant is disabled. Callers turn that null into a 503.
 *
 * GEMINI_API_KEY is preferred; GOOGLE_API_KEY is accepted as a fallback
 * because that is the name Google's own tooling and several hosting
 * providers inject.
 */
export function resolveGeminiConfig(env: NodeJS.ProcessEnv = process.env): GeminiConfig | null {
  const apiKey = env.GEMINI_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim();
  if (!apiKey) return null;

  const parsedTimeout = Number(env.GEMINI_TIMEOUT_MS);
  return {
    apiKey,
    model: env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
    apiBase: (env.GEMINI_API_BASE?.trim() || DEFAULT_API_BASE).replace(/\/+$/, ""),
    // Ignore a missing, non-numeric or non-positive override rather than
    // letting it turn into an AbortSignal.timeout(NaN).
    timeoutMs: Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : DEFAULT_TIMEOUT_MS,
  };
}

export async function callGemini(
  config: GeminiConfig,
  prompt: string,
  systemInstruction?: string
): Promise<unknown> {
  const url = `${config.apiBase}/models/${config.model}:generateContent`;

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Header auth rather than ?key=… in the query string, so the secret
        // cannot leak into proxy or access logs along the way.
        "x-goog-api-key": config.apiKey,
      },
      body: JSON.stringify(body),
      // Without this an upstream stall would hold the route open until the
      // platform's own request timeout killed it.
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new GeminiError(`Gemini request timed out after ${config.timeoutMs}ms`);
    }
    throw new GeminiError(`Could not reach Gemini: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  if (!res.ok) {
    const errText = await res.text();
    // 404 here almost always means the configured model id has been retired.
    const hint =
      res.status === 404
        ? ` (model "${config.model}" may no longer exist — set GEMINI_MODEL to a current one)`
        : "";
    throw new GeminiError(`Gemini API error ${res.status}${hint}: ${errText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiError("Unexpected Gemini response shape");
  }

  try {
    return JSON.parse(text);
  } catch {
    // A model that ignores responseMimeType and answers in prose is an
    // upstream fault, not a fault in this app — surface it as one so the
    // route maps it to 502 rather than 500.
    throw new GeminiError("Gemini returned a non-JSON payload");
  }
}
