import type {
  EnrichedInfo,
  ExclusionReason,
  ProcessedRecord,
  RawRecord,
  ReviewFlag,
  SentimentLabel,
} from "./types";

// ---------------------------------------------------------------------------
// Defensive coercion
//
// The dataset is an external feed and is documented as intentionally noisy.
// Everything below assumes a field can arrive missing, null, or of the wrong
// type, because a single malformed row otherwise takes down a whole
// server-rendered page rather than degrading one card. These do not "fix"
// data — they only stop a bad row from crashing the render, and the row
// stays flagged and visible downstream.
// ---------------------------------------------------------------------------

/** A usable string, or "" for anything that isn't one. */
function safeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** A finite number, or `fallback` for null/undefined/NaN/non-numeric input. */
function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Turn a 0-100 sentiment_score into a label. We use this as the source of
 * truth instead of the raw `sentiment` column, because some records ship
 * with a label that disagrees with their own score (e.g. "positive" at a
 * score of 46). The score is continuous and self-consistent; the label
 * sometimes isn't.
 */
function sentimentBucketFromScore(score: number): SentimentLabel {
  if (score >= 60) return "positive";
  if (score <= 40) return "negative";
  return "neutral";
}

// Phrases that reliably signal a genuine complaint (money lost, unresolved
// support contact) in this dataset's mix of Bangla / English / Banglish.
// Used to catch cases where the *score itself* looks wrong, not just the
// label — e.g. a post about money being deducted with no help, scored 91.
const NEGATIVE_INTENT_PHRASES = [
  "হেল্প নেই",
  "কেটে নিয়েছে",
  "keu dhorlo na",
  "no help",
  "wait korlam",
  "not working",
  "pending",
  "scam",
  "fraud",
  "refund",
  "reversed na",
];

function hasNegativeIntentPhrase(text: string): boolean {
  const lower = safeText(text).toLowerCase();
  return NEGATIVE_INTENT_PHRASES.some((phrase) => lower.includes(phrase.toLowerCase()));
}

// Phrases suggesting money is directly at stake — used for severity, not
// sentiment. A negative post about money is a bigger business risk than a
// negative post about, say, app color scheme.
const MONEY_AT_STAKE_PHRASES = [
  "টাকা কেটে",
  "কেটে নিয়েছে",
  "deducted",
  "charged",
  "refund",
  "lost",
  "scam",
  "fraud",
];

function computeSeverityScore(r: {
  text: string;
  reactions: number;
  comments: number;
  sentiment_score: number;
}): number {
  const lower = safeText(r.text).toLowerCase();
  // A missing score is treated as neutral (50) rather than 0, so an absent
  // field cannot masquerade as maximum negativity and top the urgent list.
  const negativeWeight = Math.max(0, 100 - safeNumber(r.sentiment_score, 50)); // 0-100, higher = more negative
  const moneyAtStake = MONEY_AT_STAKE_PHRASES.some((p) => lower.includes(p.toLowerCase()));
  const engagement = safeNumber(r.reactions) + safeNumber(r.comments);
  // Engagement is uncapped in the data, so compress it with a log curve
  // instead of letting one viral post dominate the whole ranking.
  const engagementScore = Math.min(30, Math.log10(engagement + 1) * 12);

  let score = negativeWeight * 0.6 + engagementScore;
  if (moneyAtStake) score += 20;
  return Math.round(Math.min(100, score));
}

/**
 * Clean + enrich the raw dataset. This is the single place that:
 *  - re-derives sentiment from the numeric score
 *  - flags label/score mismatches AND suspected score errors, instead of
 *    silently "fixing" either
 *  - flags duplicate and off-topic posts, with an explicit reason
 *  - computes a rule-based severity/urgency score
 *  - attaches optional offline Gemini enrichment, if provided
 *
 * We flag issues rather than deleting rows, so nothing here is destructive:
 * every downstream view decides for itself whether to include flagged rows.
 */
export function processRecords(
  raw: RawRecord[],
  enrichedMap: Record<number, EnrichedInfo> = {}
): ProcessedRecord[] {
  const seenText = new Set<string>();

  return raw.map((r) => {
    const sentimentBucket = sentimentBucketFromScore(r.sentiment_score);
    const labelScoreMismatch = sentimentBucket !== r.sentiment;

    const text = safeText(r.text);
    const normalizedText = text.trim().toLowerCase();
    // An empty text field is not evidence of duplication — several blank
    // rows would otherwise all collapse into "duplicate of each other".
    const isDuplicate = normalizedText.length > 0 && seenText.has(normalizedText);
    if (normalizedText.length > 0) seenText.add(normalizedText);

    const isOffTopic = r.topic === "off_topic";

    const timestamp = safeText(r.timestamp);
    const date = new Date(timestamp.replace(" ", "T"));
    const day = timestamp.slice(0, 10); // YYYY-MM-DD

    const reviewFlags: ReviewFlag[] = [];
    if (labelScoreMismatch) reviewFlags.push("label_score_mismatch");
    if (r.sentiment_score >= 60 && hasNegativeIntentPhrase(r.text)) {
      reviewFlags.push("suspected_score_error");
    }

    let exclusionReason: ExclusionReason = null;
    if (isOffTopic) exclusionReason = "off_topic";
    else if (isDuplicate) exclusionReason = "duplicate";

    return {
      ...r,
      sentimentBucket,
      labelScoreMismatch,
      isDuplicate,
      isOffTopic,
      date,
      day,
      exclusionReason,
      reviewFlags,
      severityScore: computeSeverityScore(r),
      enriched: enrichedMap[r.id] ?? null,
    };
  });
}

/** Records that should count toward brand-sentiment metrics: on-topic and de-duplicated. */
export function brandRelevant(records: ProcessedRecord[]): ProcessedRecord[] {
  return records.filter((r) => r.exclusionReason === null);
}

/** Records whose sentiment can't be trusted at face value and need a human look. */
export function reviewQueue(records: ProcessedRecord[]): ProcessedRecord[] {
  return [...records]
    .filter((r) => r.reviewFlags.length > 0)
    .sort((a, b) => b.severityScore - a.severityScore);
}

export interface SentimentSplit {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  avgScore: number;
}

export function computeSentimentSplit(records: ProcessedRecord[]): SentimentSplit {
  const total = records.length;
  const positive = records.filter((r) => r.sentimentBucket === "positive").length;
  const negative = records.filter((r) => r.sentimentBucket === "negative").length;
  const neutral = total - positive - negative;
  const avgScore =
    total === 0 ? 0 : records.reduce((sum, r) => sum + r.sentiment_score, 0) / total;

  return {
    positive,
    negative,
    neutral,
    total,
    positivePct: total ? (positive / total) * 100 : 0,
    negativePct: total ? (negative / total) * 100 : 0,
    neutralPct: total ? (neutral / total) * 100 : 0,
    avgScore,
  };
}

export interface DailyTrendPoint {
  day: string;
  positive: number;
  negative: number;
  neutral: number;
  avgScore: number;
  total: number;
}

export function computeDailyTrend(records: ProcessedRecord[]): DailyTrendPoint[] {
  const byDay = new Map<string, ProcessedRecord[]>();
  for (const r of records) {
    if (!byDay.has(r.day)) byDay.set(r.day, []);
    byDay.get(r.day)!.push(r);
  }

  return Array.from(byDay.entries())
    .map(([day, recs]) => {
      const split = computeSentimentSplit(recs);
      return {
        day,
        positive: split.positive,
        negative: split.negative,
        neutral: split.neutral,
        avgScore: Math.round(split.avgScore * 10) / 10,
        total: split.total,
      };
    })
    .sort((a, b) => a.day.localeCompare(b.day));
}

export interface TopicBreakdownRow {
  topic: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

export function computeTopicBreakdown(
  records: ProcessedRecord[],
  { includeOffTopic = true }: { includeOffTopic?: boolean } = {}
): TopicBreakdownRow[] {
  const source = includeOffTopic ? records : records.filter((r) => !r.isOffTopic);
  const byTopic = new Map<string, ProcessedRecord[]>();
  for (const r of source) {
    if (!byTopic.has(r.topic)) byTopic.set(r.topic, []);
    byTopic.get(r.topic)!.push(r);
  }

  return Array.from(byTopic.entries())
    .map(([topic, recs]) => {
      const split = computeSentimentSplit(recs);
      return {
        topic,
        positive: split.positive,
        negative: split.negative,
        neutral: split.neutral,
        total: split.total,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export interface PlatformRow {
  platform: string;
  total: number;
  avgScore: number;
  negativePct: number;
}

export function computePlatformBreakdown(records: ProcessedRecord[]): PlatformRow[] {
  const byPlatform = new Map<string, ProcessedRecord[]>();
  for (const r of records) {
    if (!byPlatform.has(r.platform)) byPlatform.set(r.platform, []);
    byPlatform.get(r.platform)!.push(r);
  }

  return Array.from(byPlatform.entries())
    .map(([platform, recs]) => {
      const split = computeSentimentSplit(recs);
      return {
        platform,
        total: split.total,
        avgScore: Math.round(split.avgScore * 10) / 10,
        negativePct: Math.round(split.negativePct * 10) / 10,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// Simple keyword tags used only to summarize *why* people bring up the
// competitor — not a general NLP pipeline, just enough signal for a brand
// manager to act on. Keeping this obviously simple/heuristic on purpose.
const COMPETITOR_THEMES: { label: string; keywords: string[] }[] = [
  { label: "Cashback / offers", keywords: ["cashback", "bonus", "offer"] },
  { label: "Agent availability", keywords: ["agent"] },
  { label: "Fees / charges", keywords: ["charge", "fee", "fees"] },
  { label: "Speed / app experience", keywords: ["fast", "faster", "slow", "app"] },
  { label: "Customer care", keywords: ["customer care", "care", "support", "helpline"] },
];

export interface CompetitorInsight {
  competitorName: string;
  mentionCount: number;
  sentimentSplit: SentimentSplit;
  themes: { label: string; count: number }[];
  sampleQuotes: ProcessedRecord[];
}

/**
 * TakaPay's data only ever names one rival brand by name (NgoodPay), inside
 * the "competitor" topic. We detect it dynamically instead of hardcoding it,
 * so this keeps working if the sample data changes.
 */
export function computeCompetitorInsight(records: ProcessedRecord[]): CompetitorInsight | null {
  const competitorRecords = records.filter((r) => r.topic === "competitor" && !r.isDuplicate);
  if (competitorRecords.length === 0) return null;

  // Detect the rival brand name: look for a capitalized word that isn't "TakaPay".
  const nameCounts = new Map<string, number>();
  const nameRegex = /\b[A-Z][a-zA-Z]{2,}\b/g;
  for (const r of competitorRecords) {
    const matches = r.text.match(nameRegex) ?? [];
    for (const m of matches) {
      if (m === "TakaPay") continue;
      nameCounts.set(m, (nameCounts.get(m) ?? 0) + 1);
    }
  }
  const competitorName =
    Array.from(nameCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "the competitor";

  const themes = COMPETITOR_THEMES.map((theme) => ({
    label: theme.label,
    count: competitorRecords.filter((r) =>
      theme.keywords.some((kw) => r.text.toLowerCase().includes(kw))
    ).length,
  })).filter((t) => t.count > 0);

  const sampleQuotes = [...competitorRecords]
    .sort((a, b) => b.reactions + b.comments - (a.reactions + a.comments))
    .slice(0, 3);

  return {
    competitorName,
    mentionCount: competitorRecords.length,
    sentimentSplit: computeSentimentSplit(competitorRecords),
    themes,
    sampleQuotes,
  };
}

export interface PositiveHighlight {
  topic: string;
  count: number;
  sampleQuote: ProcessedRecord;
}

/** Topics people praise most, each with one representative high-engagement quote. */
export function computePositiveHighlights(records: ProcessedRecord[]): PositiveHighlight[] {
  const positive = brandRelevant(records).filter((r) => r.sentimentBucket === "positive");
  const byTopic = new Map<string, ProcessedRecord[]>();
  for (const r of positive) {
    if (!byTopic.has(r.topic)) byTopic.set(r.topic, []);
    byTopic.get(r.topic)!.push(r);
  }

  return Array.from(byTopic.entries())
    .map(([topic, recs]) => ({
      topic,
      count: recs.length,
      sampleQuote: [...recs].sort(
        (a, b) => b.reactions + b.comments - (a.reactions + a.comments)
      )[0],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

export interface HealthScore {
  score: number; // 0-100, simply 100 - negative% of brand-relevant posts
  deltaPoints: number; // change vs the prior comparable window, in points
  direction: "up" | "down" | "flat";
}

/**
 * Shift a YYYY-MM-DD day key by a whole number of days, returning another
 * YYYY-MM-DD key.
 *
 * Day keys are anchored to UTC noon rather than midnight so that a DST
 * transition in the host timezone can never push the result onto the
 * neighbouring calendar date. The input and output are plain strings, so the
 * caller never has to reason about the host timezone at all.
 */
export function shiftDay(day: string, deltaDays: number): string {
  const anchor = new Date(`${day}T12:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() + deltaDays);
  return anchor.toISOString().slice(0, 10);
}

/**
 * Records falling inside an inclusive [fromDay, toDay] window of calendar
 * days.
 *
 * The comparison is done on the `day` string, not on the parsed `date`.
 * YYYY-MM-DD sorts lexicographically in true chronological order, so this is
 * both exact and timezone-independent — see the comment on computeHealthScore
 * for why that matters.
 */
export function sliceByDayWindow(
  records: ProcessedRecord[],
  fromDay: string,
  toDay: string
): ProcessedRecord[] {
  return records.filter((r) => r.day >= fromDay && r.day <= toDay);
}

/**
 * Deliberately simple and fully transparent: score = 100 - (% of
 * brand-relevant posts that are negative). No hidden weighting — a brand
 * manager (or a reviewer) can recompute it by hand from the sentiment split
 * shown right next to it. Trend compares the most recent 7 days of data
 * against the 7 days before that.
 *
 * The two windows are sliced on the YYYY-MM-DD `day` key rather than on the
 * parsed Date. An earlier version compared `r.date` (parsed from a timestamp
 * with no zone designator, i.e. host-local) against `new Date(lastDay)`
 * (parsed as UTC midnight). The two are not on the same clock, so the newest
 * day of data fell outside the "recent" window — entirely under UTC, and
 * partially under other offsets. That made the headline trend both wrong and
 * dependent on the server's timezone.
 */
export function computeHealthScore(records: ProcessedRecord[]): HealthScore {
  const relevant = brandRelevant(records);
  const split = computeSentimentSplit(relevant);
  const score = Math.round(100 - split.negativePct);

  const days = Array.from(new Set(relevant.map((r) => r.day))).sort();
  if (days.length < 2) return { score, deltaPoints: 0, direction: "flat" };

  // Two adjacent, non-overlapping 7-day windows ending on the newest day of
  // data (inclusive), matching what the UI claims the trend measures.
  const lastDay = days[days.length - 1];
  const recentWindow = sliceByDayWindow(relevant, shiftDay(lastDay, -6), lastDay);
  const priorWindow = sliceByDayWindow(relevant, shiftDay(lastDay, -13), shiftDay(lastDay, -7));

  if (recentWindow.length === 0 || priorWindow.length === 0) {
    return { score, deltaPoints: 0, direction: "flat" };
  }

  const recentScore = 100 - computeSentimentSplit(recentWindow).negativePct;
  const priorScore = 100 - computeSentimentSplit(priorWindow).negativePct;
  const deltaPoints = Math.round(recentScore - priorScore);

  return {
    score,
    deltaPoints,
    direction: deltaPoints > 1 ? "up" : deltaPoints < -1 ? "down" : "flat",
  };
}

export function riskLabel(score: number): { label: string; color: string; accent: string } {
  if (score >= 70)
    return {
      label: "Healthy",
      color: "text-emerald-600 bg-emerald-50 ring-emerald-200",
      accent: "border-l-emerald-400",
    };
  if (score >= 50)
    return {
      label: "Moderate risk",
      color: "text-amber-600 bg-amber-50 ring-amber-200",
      accent: "border-l-amber-400",
    };
  return { label: "High risk", color: "text-rose-600 bg-rose-50 ring-rose-200", accent: "border-l-rose-400" };
}

/**
 * "failed_transaction" -> "Failed Transaction".
 *
 * Empty segments are dropped before capitalising. Indexing `w[0]` on the
 * empty string yields undefined, so an empty topic, a leading underscore or
 * a doubled underscore used to throw a TypeError here — and because this
 * feeds the executive summary on a server-rendered page, that single bad row
 * would have taken down the whole dashboard rather than one bullet.
 */
function prettyTopicLabel(topic: string): string {
  const words = safeText(topic)
    .split("_")
    .filter((w) => w.length > 0)
    .map((w) => w[0].toUpperCase() + w.slice(1));
  return words.length > 0 ? words.join(" ") : "Uncategorised";
}

/**
 * Generates the executive-summary bullets from the same aggregates the rest
 * of the dashboard already computes — plain template strings, not an LLM
 * call, so it's instant and always in sync with what's on screen.
 */
export function computeExecutiveSummary(
  records: ProcessedRecord[],
  topicBreakdown: TopicBreakdownRow[],
  competitor: CompetitorInsight | null,
  health: HealthScore
): string[] {
  const bullets: string[] = [];
  const onTopicRanked = topicBreakdown
    .filter((t) => t.topic !== "off_topic")
    .sort((a, b) => b.negative - a.negative);

  const top = onTopicRanked[0];
  if (top) {
    bullets.push(
      `${prettyTopicLabel(top.topic)} is the largest source of negative sentiment, with ${top.negative} negative posts out of ${top.total}.`
    );
  }

  const second = onTopicRanked[1];
  if (second && second.negative > 0) {
    bullets.push(
      `${prettyTopicLabel(second.topic)} is the second biggest driver, with ${second.negative} negative posts.`
    );
  }

  const bestTopic = [...topicBreakdown]
    .filter((t) => t.topic !== "off_topic" && t.positive > 0)
    .sort((a, b) => b.positive - a.positive)[0];
  if (bestTopic) {
    bullets.push(
      `${prettyTopicLabel(bestTopic.topic)} generates the most positive feedback (${bestTopic.positive} positive posts) and is worth promoting further.`
    );
  }

  if (competitor) {
    const topTheme = [...competitor.themes].sort((a, b) => b.count - a.count)[0];
    bullets.push(
      `Competitor ${competitor.competitorName} was mentioned in ${competitor.mentionCount} posts` +
        (topTheme ? `, most often about ${topTheme.label.toLowerCase()}.` : ".")
    );
  }

  if (health.direction !== "flat") {
    bullets.push(
      `Brand health is trending ${health.direction === "up" ? "up" : "down"} ${Math.abs(health.deltaPoints)} points over the last week compared to the week before.`
    );
  }

  return bullets;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-06-30" -> "June 2026". Reads the parts out of the string directly,
 *  so it never depends on the host timezone the way Date formatting would. */
function monthYearLabel(day: string): string {
  const [year, month] = day.split("-");
  return `${MONTH_NAMES[Number(month) - 1] ?? month} ${year}`;
}

export interface DatasetMeta {
  postCount: number;
  platformCount: number;
  firstDay: string | null;
  lastDay: string | null;
  /** Human-readable coverage, e.g. "June 2026" or "June 2026 - August 2026". */
  periodLabel: string;
}

/**
 * Descriptive facts about whatever dataset is actually loaded — post count,
 * how many distinct platforms it spans, and the calendar period it covers.
 *
 * The dashboard header used to state these as literals ("7 platforms, June
 * 2026"). That was true of the snapshot committed at the time and silently
 * false for any other, so a refreshed feed, an added platform or a second
 * month of collection would have left the page confidently describing data
 * it was no longer showing. Deriving them means the header cannot drift.
 */
export function computeDatasetMeta(records: ProcessedRecord[]): DatasetMeta {
  const platformCount = new Set(records.map((r) => r.platform)).size;
  const days = Array.from(new Set(records.map((r) => r.day))).sort();
  const firstDay = days[0] ?? null;
  const lastDay = days[days.length - 1] ?? null;

  let periodLabel = "";
  if (firstDay && lastDay) {
    const from = monthYearLabel(firstDay);
    const to = monthYearLabel(lastDay);
    periodLabel = from === to ? from : `${from} - ${to}`;
  }

  return { postCount: records.length, platformCount, firstDay, lastDay, periodLabel };
}

export interface DataQualityNotes {
  totalRecords: number;
  labelScoreMismatches: number;
  duplicates: number;
  offTopic: number;
  needsReview: number;
}

export function computeDataQualityNotes(records: ProcessedRecord[]): DataQualityNotes {
  return {
    totalRecords: records.length,
    labelScoreMismatches: records.filter((r) => r.reviewFlags.includes("label_score_mismatch"))
      .length,
    duplicates: records.filter((r) => r.isDuplicate).length,
    offTopic: records.filter((r) => r.isOffTopic).length,
    needsReview: records.filter((r) => r.reviewFlags.length > 0).length,
  };
}
