import { NextResponse } from "next/server";
import type { CompetitorInsight, HealthScore, PositiveHighlight, SentimentSplit, TopicBreakdownRow } from "@/lib/analytics";
import { callGemini, GeminiError } from "@/lib/gemini";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION = `You are a senior brand analytics advisor briefing the brand manager of TakaPay, a mobile-wallet app. You are shown aggregate social-listening data (topic breakdown, competitor mentions, urgent posts, positive highlights, data-quality notes) — never raw text beyond the short quotes given.

Write a briefing a busy brand manager can act on in under a minute:
- Ground every claim in the numbers or quotes provided. Never invent a fact, statistic, or quote that isn't implied by the data.
- Be direct and specific (name the topic, the number, the platform) rather than generic ("negative sentiment is up" is not useful; "failed_transaction complaints doubled and drove the health score down" is).
- Prioritize by business impact, not just volume.
- Each recommended action should be something a brand or ops team could actually do this week.`;

interface UrgentPostInput {
  text: string;
  platform: string;
  severityScore: number;
}

interface BrandAnalyticsRequest {
  topicBreakdown: TopicBreakdownRow[];
  competitor: CompetitorInsight | null;
  health: HealthScore;
  sentimentSplit: SentimentSplit;
  urgentPosts?: UrgentPostInput[];
  positiveHighlights?: PositiveHighlight[];
  dataQuality?: { needsReview: number; duplicates: number; offTopic: number; totalRecords: number };
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
  const { topicBreakdown, competitor, health, sentimentSplit, urgentPosts, positiveHighlights, dataQuality } = body;

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

  const urgentLines = (urgentPosts ?? [])
    .slice(0, 5)
    .map((p) => `- [${p.platform}, severity ${p.severityScore}] "${p.text.slice(0, 160)}"`)
    .join("\n");

  const positiveLines = (positiveHighlights ?? [])
    .slice(0, 4)
    .map((h) => `- ${h.topic} (${h.count} positive posts), e.g. "${h.sampleQuote.text.slice(0, 160)}"`)
    .join("\n");

  const dataQualityLine = dataQuality
    ? `Of ${dataQuality.totalRecords} posts in the current filter: ${dataQuality.needsReview} are flagged for human review (unreliable sentiment), ${dataQuality.duplicates} are duplicates, and ${dataQuality.offTopic} are off-topic. These are excluded from the headline numbers above.`
    : "";

  return `Brand health score: ${health.score}/100 (${health.direction}, ${health.deltaPoints} pts vs prior week)
Sentiment split: ${sentimentSplit.positivePct.toFixed(0)}% positive, ${sentimentSplit.negativePct.toFixed(0)}% negative, ${sentimentSplit.neutralPct.toFixed(0)}% neutral, across ${sentimentSplit.total} posts

Topic breakdown:
${topicLines || "(no on-topic data)"}

${competitorLine}

Most urgent negative posts right now:
${urgentLines || "(none)"}

What's working well:
${positiveLines || "(no standout positive topics)"}

${dataQualityLine}

Respond with ONLY a JSON object, no markdown fences, no other text, in this exact shape:
{"overview": "<2-3 sentence plain-language summary of where the brand stands right now>", "actions": ["<specific, prioritized recommended action, max 30 words>", ...]}
Include 3-5 items in "actions".`;
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

  try {
    const parsed = (await callGemini(apiKey, buildPrompt(body), SYSTEM_INSTRUCTION)) as {
      overview?: unknown;
      actions?: unknown;
    };

    if (typeof parsed.overview !== "string" || !Array.isArray(parsed.actions)) {
      return NextResponse.json({ error: "Gemini response missing overview/actions" }, { status: 502 });
    }

    return NextResponse.json({ overview: parsed.overview, actions: parsed.actions as string[] });
  } catch (err) {
    const status = err instanceof GeminiError ? 502 : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error calling Gemini" }, { status });
  }
}
