/**
 * Tests for the CSV export added in MR-04.
 *
 * The escaping rules are the whole risk surface here: the dataset is
 * multilingual free text from social media, so commas, quotes, newlines and
 * non-Latin scripts are the normal case rather than the edge case.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { csvFilename, escapeCsvField, postsToCsv, postsToCsvRows, toCsv } from "../lib/csv.ts";
import { processRecords } from "../lib/analytics.ts";
import type { RawRecord } from "../lib/types.ts";

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

test("plain fields are emitted unquoted", () => {
  assert.equal(escapeCsvField("Facebook"), "Facebook");
  assert.equal(escapeCsvField(42), "42");
  assert.equal(escapeCsvField(""), "");
});

test("null and undefined become empty fields, not the strings 'null'/'undefined'", () => {
  assert.equal(escapeCsvField(null), "");
  assert.equal(escapeCsvField(undefined), "");
});

test("fields containing a delimiter, quote or newline are quoted", () => {
  assert.equal(escapeCsvField("failed, again"), '"failed, again"');
  assert.equal(escapeCsvField('he said "no"'), '"he said ""no"""');
  assert.equal(escapeCsvField("line one\nline two"), '"line one\nline two"');
  assert.equal(escapeCsvField("carriage\rreturn"), '"carriage\rreturn"');
});

test("non-Latin text passes through untouched", () => {
  assert.equal(escapeCsvField("টাকা কেটে নিয়েছে"), "টাকা কেটে নিয়েছে");
});

test("a field that a spreadsheet would read as a formula is neutralised", () => {
  // Any of these opens as a live formula in Excel, Sheets and LibreOffice.
  // A social media post can begin with any character, so this is reachable.
  assert.equal(escapeCsvField("=1+1"), "'=1+1");
  assert.equal(escapeCsvField('=HYPERLINK("http://evil","click")'), `"'=HYPERLINK(""http://evil"",""click"")"`);
  assert.equal(escapeCsvField("+44 1234"), "'+44 1234");
  assert.equal(escapeCsvField("-5 taka"), "'-5 taka");
  assert.equal(escapeCsvField("@channel"), "'@channel");
  // A legitimate leading character is left alone.
  assert.equal(escapeCsvField("5 taka"), "5 taka");
});

test("rows are joined with CRLF, per RFC 4180", () => {
  assert.equal(toCsv([["a", "b"], ["c", "d"]]), "a,b\r\nc,d");
});

test("the header row names every exported column once", () => {
  const [header] = postsToCsvRows([]);
  assert.equal(new Set(header).size, header.length, "no duplicate column names");
  for (const col of ["id", "text", "sentiment_score", "severity_score", "review_flags"]) {
    assert.ok(header.includes(col), `header is missing ${col}`);
  }
});

test("the export carries derived fields alongside the original ones", () => {
  const records = processRecords([
    rec({ id: 7, sentiment: "positive", sentiment_score: 12, text: "money deducted, no help" }),
  ]);
  const [header, row] = postsToCsvRows(records);
  const at = (col: string) => row[header.indexOf(col)];

  assert.equal(at("sentiment_label_original"), "positive", "the original label is preserved");
  assert.equal(at("sentiment_bucket_derived"), "negative", "alongside the derived bucket");
  assert.equal(at("counted_in_headline_metrics"), "yes");
  assert.equal(at("review_flags"), "label_score_mismatch");
});

test("an excluded post is exported with the reason it was excluded", () => {
  const records = processRecords([
    rec({ id: 1, text: "same text" }),
    rec({ id: 2, text: "same text" }),
    rec({ id: 3, text: "unrelated", topic: "off_topic" }),
  ]);
  const [header, , dup, off] = postsToCsvRows(records);
  const at = (row: (string | number)[], col: string) => row[header.indexOf(col)];

  assert.equal(at(dup, "exclusion_reason"), "duplicate");
  assert.equal(at(dup, "counted_in_headline_metrics"), "no");
  assert.equal(at(off, "exclusion_reason"), "off_topic");
});

test("a post containing commas, quotes and newlines survives a round trip", () => {
  const nasty = 'Payment "failed", again,\nand no help';
  const csv = postsToCsv(processRecords([rec({ id: 1, text: nasty })]));
  const [, dataLine] = csv.split("\r\n");

  // The quoted field keeps its newline, so the record spans two output lines.
  assert.ok(csv.includes('"Payment ""failed"", again,\nand no help"'));
  assert.ok(dataLine.startsWith("1,"));
  // Every quote in the file is either a delimiter or an escaped pair.
  assert.equal((csv.match(/"/g) ?? []).length % 2, 0);
});

test("an empty export is still a valid file with a header", () => {
  const csv = postsToCsv([]);
  assert.equal(csv.split("\r\n").length, 1);
  assert.ok(csv.startsWith("id,timestamp,platform"));
});

test("the filename records the range and size of what was exported", () => {
  const records = processRecords([
    rec({ id: 1, timestamp: "2026-06-01 08:00:00", text: "a" }),
    rec({ id: 2, timestamp: "2026-06-30 08:00:00", text: "b" }),
  ]);
  assert.equal(csvFilename(records), "takapay-posts-2026-06-01-to-2026-06-30-2-posts.csv");

  const singleDay = processRecords([rec({ id: 1, timestamp: "2026-06-09 08:00:00" })]);
  assert.equal(csvFilename(singleDay), "takapay-posts-2026-06-09-1-posts.csv");

  assert.equal(csvFilename([]), "takapay-posts-empty.csv");
});
