"use client";

import type { Filters } from "@/lib/types";
import { prettyTopicLabel } from "@/lib/analytics";

interface FiltersBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  platforms: string[];
  topics: string[];
  resultCount: number;
  /** Download the posts behind the current view as CSV. */
  onExport: () => void;
}

export default function FiltersBar({
  filters,
  onChange,
  platforms,
  topics,
  resultCount,
  onExport,
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
            {prettyTopicLabel(t)}
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
        type="button"
        onClick={() => onChange({ platform: "all", topic: "all", sentiment: "all", search: "" })}
        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
      >
        Reset
      </button>

      <button
        type="button"
        onClick={onExport}
        disabled={resultCount === 0}
        title={
          resultCount === 0
            ? "Nothing to export with these filters"
            : `Download these ${resultCount} posts as CSV`
        }
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Export CSV
      </button>

      <span className="text-sm text-slate-400 sm:ml-auto">{resultCount} posts</span>
    </div>
  );
}
