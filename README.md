# TakaPay Social Listening Dashboard

A lightweight dashboard that turns **660 multilingual social media posts** about the fictional mobile-wallet brand **TakaPay** into actionable insights for a non-technical brand manager.

Built for the **DeepDive Associate Product Engineer Take-home Assignment**.

---

## Live Demo

🔗 https://deepdive-takapay12.vercel.app/

## GitHub

🔗 https://github.com/codenim34/deepdive-takapay

---

# Features

### Dashboard

The dashboard is designed to answer three questions:

- How is the brand performing?
- What are customers talking about?
- What needs attention right now?
- How competitor is doing?

It includes:

- Brand Health score
- Executive summary
- Overall sentiment breakdown
- Sentiment trend
- Topic breakdown
- Platform breakdown
- Top problems
- Positive highlights
- Urgent posts
- Search & filtering
- Competitor Analysis
---

### Competitor Analysis

Around **80 posts** compare TakaPay with **NgoodPay**.

Instead of simply counting competitor mentions, the dashboard highlights:

- Why users compare the brands
- Areas where TakaPay is losing
- Common comparison themes

This helps explain **why customers may switch**, not just whether they are unhappy.

---

### Feedback Queue

The provided dataset intentionally contains noisy data.

Rather than silently trusting every sentiment label, the dashboard flags posts when:

- sentiment label and score disagree
- the text strongly contradicts the assigned sentiment

Flagged posts can be reviewed through a simple **Accept / Discard** workflow.

---

### Brand Assistant

A Gemini-powered assistant available throughout the application.

Example questions:

- Why is sentiment decreasing?
- What are customers complaining about?
- Why is NgoodPay being mentioned?
- Summarize this week's conversations.

The assistant is grounded in the dashboard's aggregated statistics rather than inventing new metrics.

---

# Product Decision

The assignment asked for **one additional insight** beyond the basic dashboard.

I chose **Competitor Analysis**.

Brand managers usually care less about how many customers are unhappy and more about **why they may leave**.

Since many posts compare TakaPay with NgoodPay, surfacing those comparisons provides a more actionable business insight than sentiment alone.

---

# Data Quality Decisions

The assignment mentions that the dataset is intentionally imperfect.

During exploration I found:

- inconsistent sentiment labels and scores
- posts whose sentiment clearly contradicts their text
- off-topic posts
- duplicate posts
- multilingual (Bangla / English) content

Instead of automatically correcting the dataset, the dashboard:

- excludes off-topic and duplicate posts from headline metrics
- flags suspicious posts for human review
- preserves every original record

This keeps the dashboard transparent and avoids silently modifying the source data.

---

# Architecture

```text
data/takapay.json
        │
        ▼
lib/loadRecords.ts
        │
        ▼
lib/analytics.ts
(cleaning, validation, scoring, aggregation)
        │
        ├──────────────┬───────────────┬──────────────┐
        ▼              ▼               ▼              ▼
 Dashboard      Competitor View   Feedback Queue   Brand Assistant
      │                               │                 │
      └───────────────────────────────┴────────────► Gemini API
```

### Responsibilities

- **data/** — static dataset used as the application's data source.
- **lib/analytics.ts** — core processing pipeline responsible for cleaning, flagging data-quality issues, calculating sentiment, topics, severity, competitor insights, and dashboard metrics.
- **lib/loadRecords.ts** — shared loader used by every page.
- **components/** — reusable UI components that render processed data.
- **app/** — Dashboard, Competitor Analysis, Feedback Queue, and API routes.
- **Brand Assistant** — the only feature using Gemini, grounded in dashboard aggregates.

### Design Principle

> **Flag, don't modify.**

The original dataset is never changed.

Instead, records are annotated with flags such as duplicate, off-topic, or suspicious sentiment.

Dashboard metrics decide whether flagged records should contribute to headline analytics, keeping every decision transparent.

---

# What I'd Build With Another Week

Rather than adding unrelated features, I'd continue extending the current workflow.

### 1. Investigation Mode

Clicking a topic (e.g. Failed Transactions) would open:

- historical trend
- representative posts
- platform distribution
- AI-generated root cause summary

This helps explain **why** an issue is growing.

---

### 2. Smart Alerts

Notify brand managers when unusual spikes occur.

Example:

> OTP complaints increased 240% since yesterday.

Instead of requiring managers to constantly monitor the dashboard, important issues would come to them.

---

### 3. Persistent Review Workflow

The current Accept / Discard flow is UI-only.

A production version would:

- save review decisions
- record reviewer history
- maintain an audit trail

---

### 4. Improved Duplicate & Competitor Detection

Replace the current rule-based matching with lightweight ML models to improve:

- duplicate detection
- competitor theme extraction
- severity scoring

---

### 5. Shareable Reports

Allow users to:

- export PDF summaries
- share filtered dashboard links
- schedule weekly reports

---

# Running Locally

```bash
npm install
npm run dev
```

Open:

```
http://localhost:3000
```

---

# Environment Variables

Only the Brand Assistant requires Gemini.

```env
GEMINI_API_KEY=your_api_key
```

Without a Gemini API key, the dashboard continues to function normally; only the Brand Assistant is disabled.

---

# Notes

The goal of this project was not to build a complete social listening platform.

Instead, I focused on building a transparent, easy-to-understand product that transforms messy social media conversations into insights a brand manager can quickly understand and act on, while remaining honest about data quality and avoiding black-box metrics.
