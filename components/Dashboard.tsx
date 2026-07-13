"use client";

import { useMemo, useState } from "react";
import {
  brandRelevant,
  computeCompetitorInsight,
  computeDailyTrend,
  computeDataQualityNotes,
  computeExecutiveSummary,
  computeHealthScore,
  computePlatformBreakdown,
  computePositiveHighlights,
  computeSentimentSplit,
  computeTopicBreakdown,
  reviewQueue,
} from "@/lib/analytics";
import type { Filters, ProcessedRecord } from "@/lib/types";
import StatCard from "./StatCard";
import SentimentDonut from "./SentimentDonut";
import TrendChart from "./TrendChart";
import TopicBreakdownChart from "./TopicBreakdownChart";
import PlatformChart from "./PlatformChart";
import CompetitorPanel from "./CompetitorPanel";
import FiltersBar from "./FiltersBar";
import DataQualityNote from "./DataQualityNote";
import ExecutiveSummary from "./ExecutiveSummary";
import BrandHealthHeader from "./BrandHealthHeader";
import TopProblemsTable from "./TopProblemsTable";
import PositiveHighlights from "./PositiveHighlights";
import UrgentPosts from "./UrgentPosts";
import ReviewQueuePanel from "./ReviewQueuePanel";

export default function Dashboard({ records }: { records: ProcessedRecord[] }) {
  const [filters, setFilters] = useState<Filters>({
    platform: "all",
    topic: "all",
    sentiment: "all",
    search: "",
  });

  const platforms = useMemo(
    () => Array.from(new Set(records.map((r) => r.platform))).sort(),
    [records]
  );
  const topics = useMemo(
    () => Array.from(new Set(records.map((r) => r.topic))).sort(),
    [records]
  );

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return records.filter((r) => {
      if (filters.platform !== "all" && r.platform !== filters.platform) return false;
      if (filters.topic !== "all" && r.topic !== filters.topic) return false;
      if (filters.sentiment !== "all" && r.sentimentBucket !== filters.sentiment) return false;
      if (search && !r.text.toLowerCase().includes(search) && !r.author.toLowerCase().includes(search))
        return false;
      return true;
    });
  }, [records, filters]);

  // Headline sentiment is computed off "brand-relevant" posts (on-topic,
  // de-duplicated) within whatever the user has filtered to.
  const relevant = useMemo(() => brandRelevant(filtered), [filtered]);
  const sentimentSplit = useMemo(() => computeSentimentSplit(relevant), [relevant]);
  const health = useMemo(() => computeHealthScore(filtered), [filtered]);
  const trend = useMemo(() => computeDailyTrend(relevant), [relevant]);
  const topicBreakdown = useMemo(() => computeTopicBreakdown(filtered), [filtered]);
  const platformBreakdown = useMemo(() => computePlatformBreakdown(relevant), [relevant]);
  const competitorInsight = useMemo(() => computeCompetitorInsight(filtered), [filtered]);
  const positiveHighlights = useMemo(() => computePositiveHighlights(filtered), [filtered]);
  const dataQuality = useMemo(() => computeDataQualityNotes(filtered), [filtered]);
  const flaggedForReview = useMemo(() => reviewQueue(filtered), [filtered]);
  const urgentPosts = useMemo(
    () =>
      [...relevant]
        .filter((r) => r.sentimentBucket === "negative")
        .sort((a, b) => b.severityScore - a.severityScore),
    [relevant]
  );
  const summaryBullets = useMemo(
    () => computeExecutiveSummary(filtered, topicBreakdown, competitorInsight, health),
    [filtered, topicBreakdown, competitorInsight, health]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">TakaPay Social Listening</h1>
        <p className="mt-1 text-sm text-slate-500">
          {records.length} posts collected across 7 platforms, June 2026.
        </p>
      </header>

      <FiltersBar
        filters={filters}
        onChange={setFilters}
        platforms={platforms}
        topics={topics}
        resultCount={filtered.length}
      />

      <ExecutiveSummary bullets={summaryBullets} />

      <BrandHealthHeader health={health} split={sentimentSplit} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Overall sentiment"
          value={`${sentimentSplit.negativePct.toFixed(0)}% negative`}
          sublabel={`${sentimentSplit.positivePct.toFixed(0)}% positive · ${sentimentSplit.neutralPct.toFixed(0)}% neutral`}
          tone={sentimentSplit.negativePct > sentimentSplit.positivePct ? "negative" : "positive"}
        />
        <StatCard
          label="Flagged for review"
          value={String(dataQuality.needsReview)}
          sublabel="sentiment score/label don't match the text"
        />
        <StatCard
          label="Posts analyzed"
          value={String(relevant.length)}
          sublabel={`of ${filtered.length} matching filter (off-topic & duplicates excluded)`}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">Top problems</h2>
        <p className="mt-1 text-sm text-slate-500">Ranked by negative post volume.</p>
        <div className="mt-4">
          <TopProblemsTable data={topicBreakdown} />
        </div>
      </section>

      {competitorInsight && <CompetitorPanel insight={competitorInsight} />}

      <PositiveHighlights highlights={positiveHighlights} />

      <UrgentPosts posts={urgentPosts} />

      <ReviewQueuePanel records={flaggedForReview} />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-800">Sentiment split</h2>
          <SentimentDonut split={sentimentSplit} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
          <h2 className="text-base font-semibold text-slate-800">Sentiment over time</h2>
          <TrendChart data={trend} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">
          What people are talking about, and how they feel about it
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Topics ranked by volume. &ldquo;Off topic&rdquo; posts mention TakaPay in passing but
          aren&apos;t really about the brand.
        </p>
        <div className="mt-4">
          <TopicBreakdownChart data={topicBreakdown} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">Volume by platform</h2>
        <p className="mt-1 text-sm text-slate-500">
          Where the conversation is happening, and which platforms skew negative.
        </p>
        <div className="mt-4">
          <PlatformChart data={platformBreakdown} />
        </div>
      </section>

      <DataQualityNote notes={dataQuality} />

      <footer className="pb-8 pt-2 text-center text-xs text-slate-400">
        Built for the DeepDive Associate Product Engineer take-home task.
      </footer>
    </div>
  );
}
