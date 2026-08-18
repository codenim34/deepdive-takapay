/**
 * Regression suite for the analytics pipeline.
 *
 * Runs on Node's built-in test runner against the TypeScript sources
 * directly (`node --test tests/`), so it adds no dependency to the project
 * and nothing to the shipped bundle.
 *
 * Two kinds of test live here:
 *
 *  - characterisation tests, which pin down behaviour that was already
 *    correct but undocumented, so a future refactor cannot quietly change it;
 *  - regression tests, each naming the defect it guards. Those are marked
 *    with a DEF- id and would have failed before the corresponding fix.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  brandRelevant,
  computeCompetitorInsight,
  computeDailyTrend,
  computeDataQualityNotes,
  computeDatasetMeta,
  computeExecutiveSummary,
  computeHealthScore,
  computePlatformBreakdown,
  computeSentimentSplit,
  computeTopicBreakdown,
  prettyTopicLabel,
  processRecords,
  reviewQueue,
  shiftDay,
  sliceByDayWindow,
} from "../lib/analytics.ts";
import type { RawRecord } from "../lib/types.ts";

/** A valid record, overridable field by field. */
function rec(over: Partial<RawRecord> & { id: number }): RawRecord {
  return {
    platform: "Facebook",
    timestamp: "2026-06-15 10:00:00",
    author: "someone",
    text: "a post about takapay",
    language: "en",
    brand_mention: true,
    sentiment: "neutral",
    sentiment_score: 50,
    topic: "send_money",
    reactions: 0,
    comments: 0,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Sentiment bucketing
// ---------------------------------------------------------------------------

test("sentiment buckets are derived from the score at the documented boundaries", () => {
  const scores = [0, 40, 41, 59, 60, 100];
  const buckets = processRecords(scores.map((s, i) => rec({ id: i, sentiment_score: s }))).map(
    (r) => r.sentimentBucket
  );
  assert.deepEqual(buckets, [
    "negative", // 0
    "negative", // 40 — inclusive upper edge of negative
    "neutral", //  41
    "neutral", //  59
    "positive", // 60 — inclusive lower edge of positive
    "positive", // 100
  ]);
});

test("a label disagreeing with its own score is flagged, never silently rewritten", () => {
  const [r] = processRecords([rec({ id: 1, sentiment: "positive", sentiment_score: 12 })]);
  assert.equal(r.sentimentBucket, "negative", "the score wins for downstream metrics");
  assert.equal(r.sentiment, "positive", "the original label is preserved as-is");
  assert.equal(r.labelScoreMismatch, true);
  assert.deepEqual(r.reviewFlags, ["label_score_mismatch"]);
});

test("a positive score over complaint language is flagged as a suspected score error", () => {
  const [r] = processRecords([
    rec({ id: 1, sentiment: "positive", sentiment_score: 91, text: "Taka deducted, no help for 3 days" }),
  ]);
  assert.ok(r.reviewFlags.includes("suspected_score_error"));
});

// ---------------------------------------------------------------------------
// Exclusion: duplicates and off-topic posts
// ---------------------------------------------------------------------------

test("duplicates are detected case- and whitespace-insensitively, keeping the first occurrence", () => {
  const out = processRecords([
    rec({ id: 1, text: "Payment failed again" }),
    rec({ id: 2, text: "  payment FAILED again  " }),
    rec({ id: 3, text: "Something else" }),
  ]);
  assert.deepEqual(
    out.map((r) => r.isDuplicate),
    [false, true, false]
  );
  assert.equal(out[1].exclusionReason, "duplicate");
});

test("off_topic takes precedence over duplicate as the stated exclusion reason", () => {
  const out = processRecords([
    rec({ id: 1, text: "same words", topic: "off_topic" }),
    rec({ id: 2, text: "same words", topic: "off_topic" }),
  ]);
  assert.equal(out[1].isDuplicate, true);
  assert.equal(out[1].exclusionReason, "off_topic");
});

test("brandRelevant keeps only posts with no exclusion reason", () => {
  const out = processRecords([
    rec({ id: 1, text: "counted" }),
    rec({ id: 2, text: "counted" }), // duplicate
    rec({ id: 3, text: "ignored", topic: "off_topic" }),
    rec({ id: 4, text: "also counted" }),
  ]);
  assert.deepEqual(brandRelevant(out).map((r) => r.id), [1, 4]);
});

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

test("severity rises with negativity and is bumped when money is at stake", () => {
  const [mild, harsh, money] = processRecords([
    rec({ id: 1, sentiment_score: 55, text: "app feels slow" }),
    rec({ id: 2, sentiment_score: 5, text: "app feels slow" }),
    rec({ id: 3, sentiment_score: 5, text: "money deducted and never returned" }),
  ]);
  assert.ok(harsh.severityScore > mild.severityScore);
  assert.ok(money.severityScore > harsh.severityScore);
});

test("engagement is log-compressed so one viral post cannot dominate the ranking", () => {
  const [quiet, viral] = processRecords([
    rec({ id: 1, sentiment_score: 50, reactions: 10, comments: 0 }),
    rec({ id: 2, sentiment_score: 50, reactions: 1_000_000, comments: 0 }),
  ]);
  assert.ok(viral.severityScore > quiet.severityScore);
  assert.ok(
    viral.severityScore - quiet.severityScore <= 30,
    "engagement contributes at most 30 points however large it gets"
  );
});

test("the review queue is ordered by descending severity", () => {
  const queue = reviewQueue(
    processRecords([
      rec({ id: 1, sentiment: "positive", sentiment_score: 45, text: "mildly off" }),
      rec({ id: 2, sentiment: "positive", sentiment_score: 2, text: "money deducted, scam" }),
    ])
  );
  assert.deepEqual(queue.map((r) => r.id), [2, 1]);
});

// ---------------------------------------------------------------------------
// DEF-01 (MR-01): trend windows must not depend on the host timezone
// ---------------------------------------------------------------------------

test("DEF-01: shiftDay does whole-day arithmetic on YYYY-MM-DD keys", () => {
  assert.equal(shiftDay("2026-06-30", -6), "2026-06-24");
  assert.equal(shiftDay("2026-06-30", -13), "2026-06-17");
  assert.equal(shiftDay("2026-07-01", -1), "2026-06-30", "crosses a month boundary");
  assert.equal(shiftDay("2026-01-01", -1), "2025-12-31", "crosses a year boundary");
  assert.equal(shiftDay("2024-03-01", -1), "2024-02-29", "handles a leap day");
  assert.equal(shiftDay("2026-06-15", 0), "2026-06-15");
});

test("DEF-01: sliceByDayWindow is inclusive at both ends", () => {
  const out = processRecords(
    ["2026-06-23", "2026-06-24", "2026-06-27", "2026-06-30", "2026-07-01"].map((d, i) =>
      rec({ id: i, timestamp: `${d} 23:59:00` })
    )
  );
  assert.deepEqual(
    sliceByDayWindow(out, "2026-06-24", "2026-06-30").map((r) => r.day),
    ["2026-06-24", "2026-06-27", "2026-06-30"]
  );
});

/**
 * Both tests below are built so that the newest day *changes the answer*.
 * An earlier draft made the newest day agree with the rest of its window,
 * which meant the assertions still passed against the defective code — a
 * regression test that cannot fail on the bug it names is not a guard.
 * Here the recent window is one negative day plus three positive posts on
 * the newest day, so dropping that day flips the verdict from "up 75" to
 * "flat 0".
 */
function trendFixture(newestDayHour: string) {
  return processRecords([
    // Prior window, 17-23 June: uniformly negative.
    ...[17, 18, 19, 20].map((d) =>
      rec({ id: d, timestamp: `2026-06-${d} 12:00:00`, sentiment_score: 10, text: `prior ${d}` })
    ),
    // Recent window, 24-30 June: one negative day...
    rec({ id: 24, timestamp: "2026-06-24 12:00:00", sentiment_score: 10, text: "recent 24" }),
    // ...outweighed by three positive posts on the newest day.
    ...[1, 2, 3].map((n) =>
      rec({
        id: 300 + n,
        timestamp: `2026-06-30 ${newestDayHour}`,
        sentiment_score: 90,
        text: `newest day post ${n}`,
      })
    ),
  ]);
}

test("DEF-01: posts on the newest day are inside the recent trend window", () => {
  const health = computeHealthScore(trendFixture("23:30:00"));
  // Recent window: 1 negative of 4 -> 25% negative -> 75. Prior: 100% -> 0.
  assert.equal(health.deltaPoints, 75);
  assert.equal(health.direction, "up");
  // Against the pre-fix code the newest day fell outside the window, leaving
  // a recent window of one negative post: delta 0, direction "flat".
});

test("DEF-01: the health score is identical whatever timezone the host runs in", () => {
  // An early-morning stamp is the discriminating case: under UTC+6 it landed
  // before the UTC-midnight cutoff and counted, under UTC it did not.
  const original = process.env.TZ;
  const results: string[] = [];
  try {
    for (const tz of ["UTC", "Asia/Dhaka", "America/Los_Angeles", "Pacific/Kiritimati"]) {
      // TZ is read when a Date is constructed, so the fixture is rebuilt
      // inside the loop — that is what actually exercises the offset.
      process.env.TZ = tz;
      results.push(JSON.stringify(computeHealthScore(trendFixture("01:00:00"))));
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }

  assert.equal(new Set(results).size, 1, `expected one result, got ${results.join(" | ")}`);
  assert.equal(JSON.parse(results[0]).deltaPoints, 75);
});

// ---------------------------------------------------------------------------
// DEF-02..04 (MR-03): a malformed row must degrade, not crash the page
// ---------------------------------------------------------------------------

test("DEF-02: a topic with empty segments does not crash the executive summary", () => {
  for (const topic of ["", "_leading", "double__underscore", "trailing_"]) {
    const records = processRecords([rec({ id: 1, topic, sentiment_score: 10 })]);
    const bullets = computeExecutiveSummary(
      records,
      computeTopicBreakdown(records),
      null,
      computeHealthScore(records)
    );
    assert.ok(Array.isArray(bullets), `topic ${JSON.stringify(topic)} produced bullets`);
  }
});

test("DEF-03: a null or missing text field does not crash processing", () => {
  const malformed = [
    { ...rec({ id: 1 }), text: null },
    { ...rec({ id: 2 }), text: undefined },
    { ...rec({ id: 3 }), text: 42 },
  ] as unknown as RawRecord[];

  const out = processRecords(malformed);
  assert.equal(out.length, 3);
  assert.ok(out.every((r) => Number.isFinite(r.severityScore)));
  assert.ok(
    out.every((r) => !r.isDuplicate),
    "blank text is not evidence of duplication, so blank rows must not collapse together"
  );
});

test("DEF-04: missing numeric fields yield a finite severity, never NaN", () => {
  const malformed = [
    { ...rec({ id: 1 }), reactions: undefined },
    { ...rec({ id: 2 }), comments: null },
    { ...rec({ id: 3 }), sentiment_score: undefined },
  ] as unknown as RawRecord[];

  for (const r of processRecords(malformed)) {
    assert.ok(Number.isFinite(r.severityScore), `id ${r.id} scored ${r.severityScore}`);
    assert.ok(r.severityScore >= 0 && r.severityScore <= 100);
  }
});

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

test("an empty dataset produces zeroes rather than NaN percentages", () => {
  const split = computeSentimentSplit([]);
  assert.deepEqual(split, {
    positive: 0, negative: 0, neutral: 0, total: 0,
    positivePct: 0, negativePct: 0, neutralPct: 0, avgScore: 0,
  });
  assert.deepEqual(computeDailyTrend([]), []);
  assert.deepEqual(computeTopicBreakdown([]), []);
  assert.deepEqual(computePlatformBreakdown([]), []);
  assert.equal(computeCompetitorInsight([]), null);
  assert.equal(computeHealthScore([]).direction, "flat");
});

test("sentiment percentages of a known split are exact", () => {
  const split = computeSentimentSplit(
    processRecords([
      rec({ id: 1, sentiment_score: 90, text: "a" }),
      rec({ id: 2, sentiment_score: 10, text: "b" }),
      rec({ id: 3, sentiment_score: 10, text: "c" }),
      rec({ id: 4, sentiment_score: 50, text: "d" }),
    ])
  );
  assert.equal(split.total, 4);
  assert.equal(split.positive, 1);
  assert.equal(split.negative, 2);
  assert.equal(split.neutral, 1);
  assert.equal(split.negativePct, 50);
  assert.equal(split.avgScore, 40);
});

test("the daily trend is sorted chronologically regardless of input order", () => {
  const trend = computeDailyTrend(
    processRecords([
      rec({ id: 1, timestamp: "2026-06-30 10:00:00", text: "c" }),
      rec({ id: 2, timestamp: "2026-06-02 10:00:00", text: "a" }),
      rec({ id: 3, timestamp: "2026-06-11 10:00:00", text: "b" }),
    ])
  );
  assert.deepEqual(trend.map((p) => p.day), ["2026-06-02", "2026-06-11", "2026-06-30"]);
});

test("topic breakdown ranks by volume and can exclude off-topic posts on request", () => {
  const records = processRecords([
    rec({ id: 1, topic: "failed_transaction", text: "p1" }),
    rec({ id: 2, topic: "failed_transaction", text: "p2" }),
    rec({ id: 3, topic: "recharge", text: "p3" }),
    rec({ id: 4, topic: "off_topic", text: "p4" }),
  ]);
  assert.deepEqual(
    computeTopicBreakdown(records).map((t) => t.topic),
    ["failed_transaction", "recharge", "off_topic"]
  );
  assert.deepEqual(
    computeTopicBreakdown(records, { includeOffTopic: false }).map((t) => t.topic),
    ["failed_transaction", "recharge"]
  );
});

test("data-quality counts describe the whole input, including excluded rows", () => {
  const notes = computeDataQualityNotes(
    processRecords([
      rec({ id: 1, text: "dup" }),
      rec({ id: 2, text: "dup" }),
      rec({ id: 3, topic: "off_topic", text: "ot" }),
      rec({ id: 4, sentiment: "positive", sentiment_score: 5, text: "mismatch" }),
    ])
  );
  assert.equal(notes.totalRecords, 4);
  assert.equal(notes.duplicates, 1);
  assert.equal(notes.offTopic, 1);
  assert.equal(notes.labelScoreMismatches, 1);
  assert.equal(notes.needsReview, 1);
});

// ---------------------------------------------------------------------------
// Competitor detection
// ---------------------------------------------------------------------------

test("the rival brand is detected from the text rather than hardcoded", () => {
  const insight = computeCompetitorInsight(
    processRecords([
      rec({ id: 1, topic: "competitor", text: "NgoodPay cashback is better than TakaPay" }),
      rec({ id: 2, topic: "competitor", text: "NgoodPay agent found everywhere" }),
      rec({ id: 3, topic: "competitor", text: "moved to NgoodPay, lower charge" }),
    ])
  );
  assert.ok(insight);
  assert.equal(insight.competitorName, "NgoodPay");
  assert.equal(insight.mentionCount, 3);
  assert.deepEqual(
    insight.themes.map((t) => t.label).sort(),
    ["Agent availability", "Cashback / offers", "Fees / charges"]
  );
});

// ---------------------------------------------------------------------------
// MR-02: dataset metadata must describe the data actually loaded
// ---------------------------------------------------------------------------

test("dataset metadata is derived from the records, not hardcoded", () => {
  const oneMonth = computeDatasetMeta(
    processRecords([
      rec({ id: 1, platform: "Facebook", timestamp: "2026-06-01 08:00:00", text: "a" }),
      rec({ id: 2, platform: "Reddit", timestamp: "2026-06-30 08:00:00", text: "b" }),
    ])
  );
  assert.deepEqual(oneMonth, {
    postCount: 2,
    platformCount: 2,
    firstDay: "2026-06-01",
    lastDay: "2026-06-30",
    periodLabel: "June 2026",
  });

  const spanning = computeDatasetMeta(
    processRecords([
      rec({ id: 1, timestamp: "2026-06-01 08:00:00", text: "a" }),
      rec({ id: 2, timestamp: "2026-08-03 08:00:00", text: "b" }),
    ])
  );
  assert.equal(spanning.periodLabel, "June 2026 - August 2026");

  const empty = computeDatasetMeta([]);
  assert.deepEqual(empty, {
    postCount: 0, platformCount: 0, firstDay: null, lastDay: null, periodLabel: "",
  });
});

// ---------------------------------------------------------------------------
// MR-04: one shared topic formatter, previously cloned in five places
// ---------------------------------------------------------------------------

test("prettyTopicLabel is the single formatter, and it tolerates empty segments", () => {
  assert.equal(prettyTopicLabel("failed_transaction"), "Failed Transaction");
  assert.equal(prettyTopicLabel("recharge"), "Recharge");
  // Each of these threw a TypeError in all five cloned copies.
  assert.equal(prettyTopicLabel("_leading"), "Leading");
  assert.equal(prettyTopicLabel("double__underscore"), "Double Underscore");
  assert.equal(prettyTopicLabel("trailing_"), "Trailing");
  assert.equal(prettyTopicLabel(""), "Uncategorised");
  assert.equal(prettyTopicLabel("___"), "Uncategorised");
});
