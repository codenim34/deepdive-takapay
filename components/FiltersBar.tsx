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
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
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
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
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
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
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
        className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
      />

      <button
        onClick={() => onChange({ platform: "all", topic: "all", sentiment: "all", search: "" })}
        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
      >
        Reset
      </button>

      <span className="ml-auto text-sm text-slate-400">{resultCount} posts</span>
    </div>
  );
}
