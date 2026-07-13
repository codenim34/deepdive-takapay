export type SentimentLabel = "positive" | "negative" | "neutral";

export type ExclusionReason = "off_topic" | "duplicate" | null;
export type ReviewFlag = "label_score_mismatch" | "suspected_score_error";

export interface RawRecord {
  id: number;
  platform: string;
  timestamp: string;
  author: string;
  text: string;
  language: string;
  brand_mention: boolean;
  sentiment: SentimentLabel;
  sentiment_score: number;
  topic: string;
  reactions: number;
  comments: number;
}

/** Optional per-record AI enrichment, produced offline by scripts/enrich.mjs
 *  and loaded from data/enriched.json if present. Never required — the
 *  dashboard falls back to deterministic explanations when this is absent. */
export interface EnrichedInfo {
  correctedSentiment: SentimentLabel;
  confidence: number; // 0-100
  reason: string;
}

export interface ProcessedRecord extends RawRecord {
  /** Sentiment bucket re-derived from sentiment_score, since the provided
   *  `sentiment` label doesn't always agree with the score. This is the
   *  bucket used everywhere in the dashboard. */
  sentimentBucket: SentimentLabel;
  /** True when the provided label disagreed with the score-derived bucket. */
  labelScoreMismatch: boolean;
  /** True when this record's text is a duplicate of an earlier record's text. */
  isDuplicate: boolean;
  /** True when topic === "off_topic" (post isn't really about the brand). */
  isOffTopic: boolean;
  /** Parsed JS Date for charting/filtering. */
  date: Date;
  /** YYYY-MM-DD bucket for daily aggregation. */
  day: string;
  /** Why this record is excluded from headline brand-sentiment metrics, if at all. */
  exclusionReason: ExclusionReason;
  /** Reliability concerns with this record's sentiment — can hold more than one. */
  reviewFlags: ReviewFlag[];
  /** 0-100 priority score: how urgently this post likely needs a response. */
  severityScore: number;
  /** Optional offline Gemini enrichment, if scripts/enrich.mjs has been run. */
  enriched: EnrichedInfo | null;
}

export interface Filters {
  platform: string; // "all" or a specific platform
  topic: string; // "all" or a specific topic
  sentiment: string; // "all" | "positive" | "negative" | "neutral"
  search: string; // free-text search over post text/author
}

