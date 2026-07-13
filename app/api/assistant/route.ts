import { NextResponse } from "next/server";
import { callGemini, GeminiError } from "@/lib/gemini";
import type { AssistantContext } from "@/lib/assistantContext";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface AssistantRequest {
  messages: ChatMessage[];
  context: AssistantContext;
}

function isValidBody(body: unknown): body is AssistantRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.messages) || b.messages.length === 0) return false;
  if (!b.messages.every((m) => m && typeof m === "object" && typeof (m as ChatMessage).text === "string" && ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant"))) {
    return false;
  }
  return typeof b.context === "object" && b.context !== null;
}

function buildSystemInstruction(context: AssistantContext): string {
  const { topicBreakdown, competitor, health, sentimentSplit, urgentPosts, positiveHighlights, dataQuality } = context;

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
    : "No competitor mentions in the data.";

  const urgentLines = urgentPosts
    .map((p) => `- [${p.platform}, severity ${p.severityScore}] "${p.text.slice(0, 160)}"`)
    .join("\n");

  const positiveLines = positiveHighlights
    .slice(0, 4)
    .map((h) => `- ${h.topic} (${h.count} positive posts), e.g. "${h.sampleQuote.text.slice(0, 160)}"`)
    .join("\n");

  return `You are a data assistant helping the brand manager of TakaPay, a mobile-wallet app, understand their social listening data. Answer conversationally and concisely.

Ground every answer ONLY in the data below — never invent a statistic, quote, or fact that isn't implied by it. If a question can't be answered from this data, say so plainly instead of guessing.

Brand health score: ${health.score}/100 (${health.direction}, ${health.deltaPoints} pts vs prior week)
Sentiment split: ${sentimentSplit.positivePct.toFixed(0)}% positive, ${sentimentSplit.negativePct.toFixed(0)}% negative, ${sentimentSplit.neutralPct.toFixed(0)}% neutral, across ${sentimentSplit.total} posts

Topic breakdown:
${topicLines || "(no on-topic data)"}

${competitorLine}

Most urgent negative posts:
${urgentLines || "(none)"}

What's working well:
${positiveLines || "(no standout positive topics)"}

Data quality: of ${dataQuality.totalRecords} posts, ${dataQuality.needsReview} are flagged for human review, ${dataQuality.duplicates} are duplicates, ${dataQuality.offTopic} are off-topic.

Respond with ONLY a JSON object, no markdown fences, no other text, in this exact shape:
{"reply": "<your conversational answer, plain text, no markdown>"}`;
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

  const systemInstruction = buildSystemInstruction(body.context);
  const conversation = body.messages
    .map((m) => `${m.role === "user" ? "Brand manager" : "Assistant"}: ${m.text}`)
    .join("\n\n");

  try {
    const parsed = (await callGemini(apiKey, conversation, systemInstruction)) as { reply?: unknown };

    if (typeof parsed.reply !== "string") {
      return NextResponse.json({ error: "Gemini response missing reply" }, { status: 502 });
    }

    return NextResponse.json({ reply: parsed.reply });
  } catch (err) {
    const status = err instanceof GeminiError ? 502 : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error calling Gemini" }, { status });
  }
}
