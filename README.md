# TakaPay Social Listening Dashboard

A small dashboard that turns 660 raw, multilingual social posts about TakaPay
(a fictional mobile-wallet brand) into something a non-technical brand
manager could open and act on. Built for the DeepDive Associate Product
Engineer take-home task.

**Live demo:** _add your deployed URL here after deploying_
**Repo:** _add your GitHub URL here_

## What I built

A single-page Next.js dashboard (App Router, TypeScript, Tailwind, Recharts)
that reads the provided dataset at build time and shows, top to bottom:

- **Executive summary** — auto-generated bullets ("Failed_transaction is the
  largest source of negative sentiment...") built from template strings
  against the same aggregates the charts use below it — not an LLM call, so
  it's always in sync with what's on screen and costs nothing to render.
- **Brand health score** — a deliberately transparent 0-100 score
  (`100 − % of brand-relevant posts that are negative`), shown with the
  exact formula next to it, plus a week-over-week trend delta. No hidden
  weighting — anyone can recompute it by hand from the sentiment split
  shown right beside it.
- **Top problems** — topics ranked by negative-post volume, with a
  business-impact label.
- **Competitor comparison** against NgoodPay (see "the insight I added"
  below).
- **What's working** — topics generating the most positive feedback, each
  with a representative quote, for the marketing side of the same coin.
- **Urgent posts** — negative posts ranked by a rule-based severity score
  (negativity + engagement + whether money is explicitly at stake), i.e.
  the posts most likely to need a direct response first.
- **Needs human review** — a single flagged-post queue (not a full
  triage/audit trail) for posts whose sentiment can't be trusted at face
  value, each with a plain-language reason. See "wrong sentiment as a
  feature" below.
- **Detail views** — sentiment donut, sentiment-over-time trend, topic
  breakdown by sentiment, and platform breakdown, for anyone who wants to
  drill past the summary.
- **Filters** — by platform, topic, sentiment, and free-text search.
- **A visible data-quality note** — see below, this is deliberate.

## The insight I added, and why

**A competitor comparison against NgoodPay**, plus a rule-based **severity
score** for urgent posts. ~80 of the 660 posts explicitly compare TakaPay to
a named rival, NgoodPay, on cashback offers, agent availability, fees, app
speed, and customer care — and TakaPay loses that comparison in most of
them. That answers a sharper question than "are people unhappy": it tells
the brand manager *why they might be switching away*. The severity score
complements this by surfacing which negative posts most need a direct
response *right now*, based on negativity, engagement, and whether money is
explicitly at stake — not just sentiment alone. Both are simple, auditable
rules (keyword/phrase matching + arithmetic), not a black-box model, on
purpose: a 4-6 hour task is the wrong place for an unverifiable classifier.

## What I noticed about the data

- **Sentiment label vs. sentiment score disagreement**, and — more
  seriously — **cases where the score itself looks wrong**. A handful of
  posts are labeled `positive` with a `sentiment_score` below 50 (and vice
  versa); those are mostly off-topic posts caught by the brand-mention
  filter. But a few posts go further: genuine money-loss complaints
  ("deducted 1500 taka, recharge failed, no help from TakaPay") scored
  75-92, i.e. strongly *positive*. I didn't hand-edit any labels or scores.
  Instead, every post gets checked against two independent rules — does the
  label disagree with the score, and does the text contain clear complaint
  language despite a high score — and anything that trips either rule goes
  into the "Needs human review" queue with a plain-language reason, rather
  than being silently corrected or silently trusted.
- **`brand_mention` is `True` for all 660 rows**, including ~60 posts tagged
  `off_topic` that aren't really about the brand (they just happen to
  mention it, or don't meaningfully engage with it). I exclude these from
  headline sentiment metrics but still show them as their own category in
  the topic breakdown, so nothing is hidden — just not allowed to skew the
  top-line number.
- **~20 near-duplicate posts** (same text, different id/author/platform).
  These are excluded from headline sentiment and topic totals so a single
  repeated post can't inflate a trend, but they're not deleted from the
  underlying dataset.
- **Mixed Bangla / English / Bangla-English text** (`bn`, `en`, `bn-en`).
  I didn't attempt any translation or re-scoring of sentiment from raw text
  — I trust the provided labels/scores except where the two review rules
  above flag a specific problem, since re-deriving sentiment from scratch in
  three scripts/registers in a few hours would be a much bigger and riskier
  undertaking than the task calls for.

## Optional: offline Gemini enrichment for the review queue

`scripts/enrich.mjs` is a standalone script (not called by the deployed
app) that sends just the flagged "needs review" posts to Gemini for a
second opinion, and writes the result to `data/enriched.json`. Run it
locally with:

```bash
GEMINI_API_KEY=your_key npm run enrich
```

The dashboard reads `data/enriched.json` if present and shows Gemini's
suggested correction + reason instead of the deterministic explanation. It
ships as `{}` in the repo and the dashboard works identically either way —
I deliberately kept this out of the deployed app's runtime path: a live LLM
call from the production site would mean shipping an API key and making the
live demo depend on a third-party API staying up during review, which is
the wrong tradeoff for something graded on "does the live demo work."

## What I'd improve with another week

- Replace the keyword-based competitor-theme tagging and severity scoring
  with a small classifier, so they aren't limited to a hand-picked keyword
  list.
- Add a proper fuzzy-duplicate detector (current one only catches
  exact-text duplicates after trimming/lowercasing; near-identical
  paraphrases would slip through).
- Extend the offline Gemini enrichment to cover the executive summary too,
  as an optional AI-polished paragraph layered on top of the deterministic
  bullets, rather than only the review queue.
- Add a way for a brand manager to resolve a "needs review" post themselves
  (accept/override the sentiment) and have that persist.
- Add authentication and a way to save/share a filtered view (e.g. a
  permalink to "just failed_transaction posts from the last week").

## Where AI helped, and where I overrode it

- I used AI to scaffold the Next.js project structure and boilerplate
  chart components quickly, which let me spend more of the time budget on
  the actual product decisions (what to measure, what to exclude, what the
  one extra insight should be) rather than on wiring.
- Early drafts of the "review" logic only checked label-vs-score
  disagreement. Digging into the data by hand surfaced a worse case: posts
  with money-loss complaints scored 75-92 (strongly positive) where the
  label *and* score were both wrong, not just mismatched with each other.
  I added a second, independent rule (negative-intent phrase matching) to
  catch that category too, since trusting the score as ground truth would
  have missed it.
- An early version treated every `brand_mention: true` row as brand-relevant
  sentiment, which would have let ~60 off-topic posts (traffic, weather,
  food posts that just happen to mention TakaPay) quietly drag the headline
  sentiment number down for the wrong reason. I added the `off_topic`
  exclusion after checking, rather than trusting the flag as given.
- I considered a single composite "Trust Score" combining multiple weighted
  signals, but rejected it — I couldn't justify the weights under
  questioning, so I replaced it with the current Brand Health score, which
  is one transparent formula (`100 − % negative`) shown next to its own
  inputs.
- I also decided against calling an LLM live from the deployed app (for
  sentiment correction or an AI-generated summary) because it would add an
  API-key/cost/uptime dependency to something graded on staying reachable
  during review. The optional Gemini enrichment script reflects that: it
  runs offline, touches only the already-flagged subset, and the app works
  identically with or without it.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploying

This is a static-data Next.js app with no required env vars, so it deploys
as-is to Vercel:

```bash
npx vercel --prod
```

or connect the GitHub repo directly in the Vercel dashboard.
