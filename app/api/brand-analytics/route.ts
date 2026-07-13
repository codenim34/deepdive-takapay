import { NextResponse } from "next/server";
import type { CompetitorInsight, HealthScore, SentimentSplit, TopicBreakdownRow } from "@/lib/analytics";

export const runtime = "nodejs";

const MODEL = "gemini-3.1-flash-lite";

interface BrandAnalyticsRequest {
  topicBreakdown: TopicBreakdownRow[];
  competitor: CompetitorInsight | null;
  health: HealthScore;
  sentimentSplit: SentimentSplit;
}

function isValidBody(body: unknown): body is BrandAnalyticsRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    Array.isArray(b.topicBreakdown) &&
    typeof b.health === "object" &&
    b.health !== null &&
    typeof b.sentimentSplit === "object" &&
    b.sentimentSplit !== null
  );
}

function buildPrompt(body: BrandAnalyticsRequest): string {
  const { topicBreakdown, competitor, health, sentimentSplit } = body;

  const topicLines = topicBreakdown
    .filter((t) => t.topic !== "off_topic")
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((t) => `- ${t.topic}: ${t.total} posts (${t.positive} positive, ${t.negative} negative)`)
    .join("\n");

  const competitorLine = competitor
    ? `Competitor "${competitor.competitorName}" was mentioned in ${competitor.mentionCount} posts. Top themes: ${competitor.themes
        .map((t) => `${t.label} (${t.count})`)
        .join(", ") || "none"}.`
    : "No competitor mentions in the current data.";

  return `You are a brand analytics assistant for a mobile-wallet brand called TakaPay. Based ONLY on the aggregate numbers below (do not invent facts not implied by them), write 3-5 short executive-summary bullet points a brand manager could act on. Be concrete, reference the numbers, and keep each bullet under 30 words. Do not use markdown formatting or bullet characters in the strings themselves.

Brand health score: ${health.score}/100 (${health.direction}, ${health.deltaPoints} pts vs prior week)
Sentiment split: ${sentimentSplit.positivePct.toFixed(0)}% positive, ${sentimentSplit.negativePct.toFixed(0)}% negative, ${sentimentSplit.neutralPct.toFixed(0)}% neutral, across ${sentimentSplit.total} posts

Topic breakdown:
${topicLines || "(no on-topic data)"}

${competitorLine}

Respond with ONLY a JSON object, no markdown fences, no other text, in this exact shape:
{"bullets": ["<bullet 1>", "<bullet 2>", ...]}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "Invalid request shape" }, { status: 400 });
  }

  const prompt = buildPrompt(body);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Gemini API error ${res.status}: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: "Unexpected Gemini response shape" }, { status: 502 });
    }

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.bullets)) {
      return NextResponse.json({ error: "Gemini response missing bullets array" }, { status: 502 });
    }

    return NextResponse.json({ bullets: parsed.bullets as string[] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error calling Gemini" },
      { status: 502 }
    );
  }
}
