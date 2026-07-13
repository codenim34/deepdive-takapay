import {
  brandRelevant,
  computeCompetitorInsight,
  computeDataQualityNotes,
  computeHealthScore,
  computePositiveHighlights,
  computeSentimentSplit,
  computeTopicBreakdown,
  type CompetitorInsight,
  type DataQualityNotes,
  type HealthScore,
  type PositiveHighlight,
  type SentimentSplit,
  type TopicBreakdownRow,
} from "./analytics";
import type { ProcessedRecord } from "./types";

export interface UrgentPostSummary {
  text: string;
  platform: string;
  severityScore: number;
}

export interface AssistantContext {
  topicBreakdown: TopicBreakdownRow[];
  competitor: CompetitorInsight | null;
  health: HealthScore;
  sentimentSplit: SentimentSplit;
  urgentPosts: UrgentPostSummary[];
  positiveHighlights: PositiveHighlight[];
  dataQuality: DataQualityNotes;
}

/** Aggregate snapshot of the whole dataset, shared by the chat assistant on
 *  every page — it grounds Gemini's answers without sending raw post text
 *  beyond a handful of short quotes. */
export function buildAssistantContext(records: ProcessedRecord[]): AssistantContext {
  const relevant = brandRelevant(records);

  return {
    topicBreakdown: computeTopicBreakdown(records),
    competitor: computeCompetitorInsight(records),
    health: computeHealthScore(records),
    sentimentSplit: computeSentimentSplit(relevant),
    urgentPosts: [...relevant]
      .filter((r) => r.sentimentBucket === "negative")
      .sort((a, b) => b.severityScore - a.severityScore)
      .slice(0, 5)
      .map((p) => ({ text: p.text, platform: p.platform, severityScore: p.severityScore })),
    positiveHighlights: computePositiveHighlights(records),
    dataQuality: computeDataQualityNotes(records),
  };
}
