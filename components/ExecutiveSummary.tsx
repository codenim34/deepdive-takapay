"use client";

import { useState } from "react";

export interface AiBrandAnalytics {
  overview: string;
  actions: string[];
}

export default function ExecutiveSummary({
  ruleBasedBullets,
  ai,
  loading,
  error,
  onGenerate,
}: {
  ruleBasedBullets: string[];
  ai: AiBrandAnalytics | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  const [viewMode, setViewMode] = useState<"rule" | "ai">("rule");

  function selectAi() {
    setViewMode("ai");
    if (!ai && !loading) onGenerate();
  }

  const showingAi = viewMode === "ai";

  return (
    <div
      className={`rounded-xl border border-l-4 border-slate-200 bg-white p-6 shadow-sm ${
        showingAi ? "border-l-violet-400" : "border-l-slate-300"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-800">Brand Analytics</h2>
        <div className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setViewMode("rule")}
            className={`rounded-md px-2.5 py-1 transition ${
              !showingAi ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Rule based
          </button>
          <button
            type="button"
            onClick={selectAi}
            className={`rounded-md px-2.5 py-1 transition ${
              showingAi ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            AI generated
          </button>
          {showingAi && ai && !loading && (
            <button
              type="button"
              onClick={onGenerate}
              title="Regenerate with AI"
              className="rounded-md px-2 py-1 text-slate-400 hover:bg-white hover:text-slate-700"
            >
              ↻
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {showingAi
          ? "Written by Gemini from the same aggregates, urgent posts, and highlights shown on this page."
          : "Generated directly from the numbers below — nothing here is inferred beyond the data."}
      </p>

      {showingAi && error && !loading && (
        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-700 ring-1 ring-inset ring-amber-200">
          Couldn&apos;t reach Gemini: {error}. Showing rule-based analytics instead.
        </p>
      )}

      {showingAi && loading ? (
        <ul className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${85 - i * 10}%` }} />
          ))}
        </ul>
      ) : showingAi && ai ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-slate-700">{ai.overview}</p>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recommended actions</p>
            <ul className="mt-2 space-y-2">
              {ai.actions.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 text-slate-400">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : ruleBasedBullets.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {ruleBasedBullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="mt-0.5 text-slate-400">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-400">No data matches the current filters.</p>
      )}
    </div>
  );
}
