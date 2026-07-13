"use client";

import type { Filters } from "@/lib/types";

interface FiltersBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  platforms: string[];
  topics: string[];
  resultCount: number;
}

function prettyTopic(topic: string) {
  return topic
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default function FiltersBar({
  filters,
  onChange,
  platforms,
  topics,
  resultCount,
}: FiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <select
        className="min-w-0 flex-1 basis-[calc(50%-0.375rem)] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 sm:flex-none sm:basis-auto"
        value={filters.platform}
        onChange={(e) => onChange({ ...filters, platform: e.target.value })}
      >
        <option value="all">All platforms</option>
        {platforms.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <select
        className="min-w-0 flex-1 basis-[calc(50%-0.375rem)] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 sm:flex-none sm:basis-auto"
        value={filters.topic}
        onChange={(e) => onChange({ ...filters, topic: e.target.value })}
      >
        <option value="all">All topics</option>
        {topics.map((t) => (
          <option key={t} value={t}>
            {prettyTopic(t)}
          </option>
        ))}
      </select>

      <select
        className="min-w-0 flex-1 basis-[calc(50%-0.375rem)] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 sm:flex-none sm:basis-auto"
        value={filters.sentiment}
        onChange={(e) => onChange({ ...filters, sentiment: e.target.value })}
      >
        <option value="all">All sentiment</option>
        <option value="positive">Positive</option>
        <option value="neutral">Neutral</option>
        <option value="negative">Negative</option>
      </select>

      <input
        type="text"
        placeholder="Search posts or authors..."
        className="min-w-0 flex-1 basis-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 sm:basis-50"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
      />

      <button
        onClick={() => onChange({ platform: "all", topic: "all", sentiment: "all", search: "" })}
        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
      >
        Reset
      </button>

      <span className="text-sm text-slate-400 sm:ml-auto">{resultCount} posts</span>
    </div>
  );
}
