import type { ProcessedRecord } from "./types";

/**
 * CSV export of the posts behind whatever the dashboard is currently
 * showing.
 *
 * Kept as pure string functions with no DOM access so the escaping rules can
 * be tested directly; the component only wraps the result in a Blob and
 * clicks a link.
 */

/** Columns in export order: the raw fields, then what the pipeline derived. */
const COLUMNS = [
  "id",
  "timestamp",
  "platform",
  "author",
  "language",
  "text",
  "topic",
  "sentiment_label_original",
  "sentiment_score",
  "sentiment_bucket_derived",
  "reactions",
  "comments",
  "severity_score",
  "exclusion_reason",
  "review_flags",
  "counted_in_headline_metrics",
] as const;

/**
 * Escape one field for RFC 4180.
 *
 * A field is quoted when it contains a comma, a quote or a newline, and
 * embedded quotes are doubled. The dataset is multilingual free text from
 * social media, so commas, quotes and line breaks inside `text` are the
 * normal case rather than the edge case.
 *
 * The leading apostrophe on anything starting with = + - or @ is deliberate.
 * Excel, LibreOffice and Sheets all treat such a field as a formula, so a
 * post whose text begins with "=" would execute on open — a spreadsheet is
 * the whole point of this export, and the text is attacker-supplied in the
 * sense that anyone can write a social media post.
 */
export function escapeCsvField(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);

  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;

  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows (header first) as arrays of raw, unescaped values. */
export function postsToCsvRows(records: ProcessedRecord[]): (string | number)[][] {
  return [
    [...COLUMNS],
    ...records.map((r) => [
      r.id,
      r.timestamp,
      r.platform,
      r.author,
      r.language,
      r.text,
      r.topic,
      r.sentiment,
      r.sentiment_score,
      r.sentimentBucket,
      r.reactions,
      r.comments,
      r.severityScore,
      r.exclusionReason ?? "",
      r.reviewFlags.join(" | "),
      r.exclusionReason === null ? "yes" : "no",
    ]),
  ];
}

/**
 * Serialize rows to CSV text.
 *
 * CRLF line endings, per RFC 4180 and because Excel on Windows needs them to
 * keep multi-line fields in one cell.
 */
export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}

/** The full CSV document for a set of posts. */
export function postsToCsv(records: ProcessedRecord[]): string {
  return toCsv(postsToCsvRows(records));
}

/**
 * A filename that records what was exported, e.g.
 * "takapay-posts-2026-06-01-to-2026-06-30-140-posts.csv". Built from the day
 * keys rather than a formatted Date, so it carries no timezone.
 */
export function csvFilename(records: ProcessedRecord[]): string {
  if (records.length === 0) return "takapay-posts-empty.csv";
  const days = records.map((r) => r.day).sort();
  const from = days[0];
  const to = days[days.length - 1];
  const range = from === to ? from : `${from}-to-${to}`;
  return `takapay-posts-${range}-${records.length}-posts.csv`;
}
