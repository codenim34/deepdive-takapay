import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { EnrichedInfo, SentimentLabel } from "@/lib/types";

export const runtime = "nodejs";

const ENRICHED_PATH = path.join(process.cwd(), "data", "enriched.json");
const VALID_SENTIMENTS: SentimentLabel[] = ["positive", "negative", "neutral"];

interface AcceptRequest {
  id: number;
  enrichment: EnrichedInfo;
}

function isValidBody(body: unknown): body is AcceptRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (typeof b.id !== "number") return false;
  const e = b.enrichment as Record<string, unknown> | undefined;
  if (!e || typeof e !== "object") return false;
  return (
    VALID_SENTIMENTS.includes(e.correctedSentiment as SentimentLabel) &&
    typeof e.confidence === "number" &&
    typeof e.reason === "string"
  );
}

/**
 * Persists a brand manager's accepted review-queue correction into
 * data/enriched.json (rule-based suggestion, no live AI call — Gemini is
 * only used by /api/brand-analytics). Rejected suggestions never reach this
 * route; they're discarded client-side.
 *
 * Requires a writable filesystem. Works locally; typical serverless hosts
 * (e.g. Vercel) mount the deploy read-only at runtime, so this fails there
 * with a clear error rather than silently no-op-ing.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "Invalid request shape" }, { status: 400 });
  }

  try {
    const raw = await readFile(ENRICHED_PATH, "utf-8");
    const map = JSON.parse(raw) as Record<number, EnrichedInfo>;
    map[body.id] = body.enrichment;
    await writeFile(ENRICHED_PATH, JSON.stringify(map, null, 2) + "\n");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Couldn't save to data/enriched.json — this environment's filesystem is likely read-only (common on serverless hosts). Run the app locally to persist review decisions.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
