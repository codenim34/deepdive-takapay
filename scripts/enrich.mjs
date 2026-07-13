#!/usr/bin/env node
/**
 * Offline enrichment script. Run this locally (not from the deployed app):
 *
 *   GEMINI_API_KEY=your_key node scripts/enrich.mjs
 *
 * It re-derives which posts are flagged for review (same rule-based logic
 * as lib/analytics.ts, duplicated here in plain JS since this runs outside
 * Next's TypeScript build), sends *only those flagged posts* to Gemini for
 * a second opinion, and writes the result to data/enriched.json.
 *
 * Deliberately scoped to the flagged subset, not all 660 posts: those are
 * the only records whose sentiment is already known to be unreliable, so
 * that's where a second opinion actually adds value. This keeps the run
 * fast, cheap, and easy to re-check by hand.
 *
 * The dashboard works with or without this file — data/enriched.json ships
 * as `{}` in the repo, and the app falls back to a deterministic
 * explanation for every flagged post if this script hasn't been run.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "takapay.json");
const OUTPUT_PATH = path.join(__dirname, "..", "data", "enriched.json");

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

function sentimentBucketFromScore(score) {
  if (score >= 60) return "positive";
  if (score <= 40) return "negative";
  return "neutral";
}

function hasNegativeIntentPhrase(text) {
  const lower = text.toLowerCase();
  return NEGATIVE_INTENT_PHRASES.some((p) => lower.includes(p.toLowerCase()));
}

function findFlagged(records) {
  return records.filter((r) => {
    const bucket = sentimentBucketFromScore(r.sentiment_score);
    const labelScoreMismatch = bucket !== r.sentiment;
    const suspectedScoreError = r.sentiment_score >= 60 && hasNegativeIntentPhrase(r.text);
    return labelScoreMismatch || suspectedScoreError;
  });
}

async function classifyWithGemini(apiKey, record) {
  const prompt = `You are checking a possibly-mislabeled social media sentiment record for a mobile wallet brand called TakaPay. The text may be in Bangla, English, or a mix.

Post text: "${record.text}"
Provided label: ${record.sentiment}
Provided score (0-100, higher = more positive): ${record.sentiment_score}

Decide the correct sentiment toward TakaPay expressed in this post. Respond with ONLY a JSON object, no markdown fences, no other text, in this exact shape:
{"correctedSentiment": "positive" | "negative" | "neutral", "confidence": <0-100 integer>, "reason": "<one short plain-language sentence explaining why, max 25 words>"}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Unexpected Gemini response shape: ${JSON.stringify(data)}`);

  return JSON.parse(text);
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Set GEMINI_API_KEY before running this script.");
    process.exit(1);
  }

  const raw = JSON.parse(await readFile(DATA_PATH, "utf-8"));
  const flagged = findFlagged(raw);
  console.log(`${flagged.length} of ${raw.length} posts flagged for review. Calling Gemini...`);

  const result = {};
  let done = 0;
  for (const record of flagged) {
    try {
      const enrichment = await classifyWithGemini(apiKey, record);
      result[record.id] = enrichment;
    } catch (err) {
      console.error(`Failed on id ${record.id}:`, err.message);
    }
    done += 1;
    if (done % 10 === 0) console.log(`  ${done}/${flagged.length}`);
    // Light throttling to stay comfortably under free-tier rate limits.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`Wrote ${Object.keys(result).length} enrichments to ${OUTPUT_PATH}`);
}

main();
