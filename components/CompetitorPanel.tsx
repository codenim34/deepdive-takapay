import type { CompetitorInsight } from "@/lib/analytics";

export default function CompetitorPanel({ insight }: { insight: CompetitorInsight }) {
  const { competitorName, mentionCount, sentimentSplit, themes, sampleQuotes } = insight;

  return (
    <div className="rounded-xl border border-l-4 border-slate-200 border-l-amber-400 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">TakaPay vs. {competitorName}</h3>
        <span className="text-sm text-slate-500">{mentionCount} mentions</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {sentimentSplit.negativePct.toFixed(0)}% of comparison posts are negative toward TakaPay.
      </p>

      {themes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {themes
            .sort((a, b) => b.count - a.count)
            .map((theme) => (
              <span
                key={theme.label}
                className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200"
              >
                {theme.label} · {theme.count}
              </span>
            ))}
        </div>
      )}

      {sampleQuotes.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Representative posts (highest engagement)
          </p>
          {sampleQuotes.map((q) => (
            <div key={q.id} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p>&ldquo;{q.text}&rdquo;</p>
              <p className="mt-1 text-xs text-slate-400">
                {q.platform} · {q.reactions} reactions · {q.comments} comments
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
