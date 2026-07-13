# TakaPay Social Listening Dashboard

A small dashboard that turns 660 raw, multilingual social posts about TakaPay
(a fictional mobile-wallet brand) into something a non-technical brand
manager could open and act on. Built for the DeepDive Associate Product
Engineer take-home task.

**Live demo:** _add your deployed URL here after deploying_
**Repo:** _add your GitHub URL here_

## What I built

A Next.js app (App Router, TypeScript, Tailwind, Recharts) with a persistent
sidebar and three pages, all reading the same static dataset:

- **Dashboard** (`/`) — the main view:
  - **Top stat row**: total posts collected, posts discarded (off-topic /
    duplicate), posts needing human feedback (links to the Feedback page),
    and a **Brand Health** score. Clicking Brand Health opens a popup with
    the exact formula, the sentiment split behind it, and the week-over-week
    trend — nothing is hidden behind the headline number.
  - **Brand Analytics** — auto-generated bullets ("Failed_transaction is the
    largest source of negative sentiment...") built from template strings
    against the same aggregates the charts use below it. Deliberately **not**
    an LLM call — see "where I overrode AI" below for why.
  - **Top problems** (ranked by negative volume + business impact) shown
    side-by-side with **What's working** (topics generating the most
    positive feedback), so the brand manager sees both sides in one glance.
  - **Urgent posts** — negative posts ranked by a rule-based severity score
    (negativity + engagement + whether money is explicitly at stake).
  - **Detail views** — sentiment donut, sentiment-over-time trend, topic
    breakdown by sentiment, and platform breakdown.
  - **Filters** — by platform, topic, sentiment, and free-text search.
  - **A visible data-quality note** — see below, this is deliberate.
- **Competitor Analysis** (`/competitor`) — the NgoodPay comparison (see "the
  insight I added" below), broken out onto its own page since it's a
  different kind of question than day-to-day sentiment monitoring.
- **Feedback** (`/feedback`) — the review queue for posts whose sentiment
  label or score doesn't match their own text. A brand manager can **Accept**
  or **Discard** each one (demo-only — see below); no AI is involved in this
  page at all.
- **Brand Assistant** — a floating chat widget available on every page. It's
  the one place in the app that calls Gemini live, grounded in the same
  aggregate stats shown on screen (topic breakdown, competitor mentions,
  health score, urgent posts, positive highlights, data-quality counts) —
  never raw post text beyond a few short quotes. It's for open-ended
  questions ("why is failed_transaction so negative this week?"); it's not
  used anywhere the app needs a reproducible number.

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
  into the Feedback queue with a plain-language reason, rather than being
  silently corrected or silently trusted.
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

## Human review workflow

Flagged posts live on the Feedback page (`/feedback`), sourced from the same
two rules described above. There's no AI suggestion there — a brand manager
either **Accepts** or **Discards** each one, with a plain-language reason
for why it was flagged shown alongside.

**Accept/Discard is UI-only in this build — nothing is persisted.** Clicking
either button just updates that row's state in the browser; a page refresh
resets it. This is a deliberate placeholder: wiring it to a real backend
(a database write keyed by record id, behind an API route) is
straightforward but out of scope for a take-home task, and would be the
first thing to add for real use.

## What I'd improve with another week

- Replace the keyword-based competitor-theme tagging and severity scoring
  with a small classifier, so they aren't limited to a hand-picked keyword
  list.
- Add a proper fuzzy-duplicate detector (current one only catches
  exact-text duplicates after trimming/lowercasing; near-identical
  paraphrases would slip through).
- Let the Brand Assistant answer questions about individual posts, not just
  the aggregate snapshot — right now it can't quote a specific post unless
  it's already one of the handful surfaced in urgent posts/highlights.
- Persist chat history server-side (it currently resets on page reload) and
  share filter state across the Dashboard/Competitor/Feedback pages (e.g.
  via URL query params) instead of each page working off the whole dataset.
- Add authentication and a way to save/share a filtered dashboard view (e.g.
  a permalink to "just failed_transaction posts from the last week").

## Where AI helped, and where I overrode it

- I used AI to scaffold the Next.js project structure and boilerplate
  chart components quickly, which let me spend more of the time budget on
  the actual product decisions (what to measure, what to exclude, what the
  one extra insight should be) rather than on wiring.
- Early drafts of the review logic only checked label-vs-score
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
- I tried, then reversed, wiring Gemini directly into Brand Analytics
  (auto-writing the executive-summary bullets, with a rule-based fallback)
  and into the Feedback queue (a per-post "ask Gemini, then accept/reject"
  suggestion). Both got rolled back: the numbers a brand manager acts on
  need to be reproducible by hand from what's on screen, and the review
  queue didn't need a live AI opinion when a human is already making the
  final accept/discard call themselves. Gemini's one home in this app is
  now the Brand Assistant chat — clearly a separate, conversational surface,
  not something the headline metrics depend on.
- While testing the (since-removed) live analytics generation, I hit
  Gemini's free-tier quota (20 requests/day) within a single testing
  session — a concrete reminder that "call the LLM automatically on every
  filter change" doesn't hold up outside a demo. The Brand Assistant is
  explicit, user-triggered chat for exactly that reason.
- The assistant's system prompt is instructed to ground every answer only in
  the aggregate stats it's given each turn (never raw post text beyond a few
  short quotes) and to say "I don't know" rather than invent a number — the
  same trust-nothing-silently philosophy as the rest of the app, applied to
  the one part that's actually generative.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

The Brand Assistant chat requires `GEMINI_API_KEY` in your environment (see
`.env`); without it, the rest of the app works identically and the chat
simply reports that Gemini isn't configured.

## Deploying

This is a static-data Next.js app. Everything except the Brand Assistant
works with no env vars at all:

```bash
npx vercel --prod
```

or connect the GitHub repo directly in the Vercel dashboard. To enable the
Brand Assistant on a deployed instance, set `GEMINI_API_KEY` in that host's
environment variables.
