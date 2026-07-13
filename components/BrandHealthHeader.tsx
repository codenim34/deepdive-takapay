import type { HealthScore, SentimentSplit } from "@/lib/analytics";

function riskLabel(score: number): { label: string; color: string; accent: string } {
  if (score >= 70)
    return {
      label: "Healthy",
      color: "text-emerald-600 bg-emerald-50 ring-emerald-200",
      accent: "border-l-emerald-400",
    };
  if (score >= 50)
    return {
      label: "Moderate risk",
      color: "text-amber-600 bg-amber-50 ring-amber-200",
      accent: "border-l-amber-400",
    };
  return { label: "High risk", color: "text-rose-600 bg-rose-50 ring-rose-200", accent: "border-l-rose-400" };
}

export default function BrandHealthHeader({
  health,
  split,
}: {
  health: HealthScore;
  split: SentimentSplit;
}) {
  const risk = riskLabel(health.score);

  return (
    <div className={`rounded-xl border border-l-4 border-slate-200 bg-white p-6 shadow-sm ${risk.accent}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Brand Health</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-slate-900">{health.score}</span>
            <span className="text-lg text-slate-400">/ 100</span>
            {health.direction !== "flat" && (
              <span
                className={`text-sm font-medium ${health.direction === "up" ? "text-emerald-600" : "text-rose-600"}`}
              >
                {health.direction === "up" ? "▲" : "▼"} {Math.abs(health.deltaPoints)} pts vs prior
                week
              </span>
            )}
          </div>
          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${risk.color}`}
          >
            {risk.label}
          </span>
        </div>
        <div className="text-right text-xs text-slate-400">
          <p className="max-w-55">
            Score = 100 − % of brand-relevant posts that are negative ({split.negativePct.toFixed(0)}% negative currently).
            No hidden weighting.
          </p>
        </div>
      </div>
    </div>
  );
}
