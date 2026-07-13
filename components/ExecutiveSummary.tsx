export default function ExecutiveSummary({
  bullets,
  source,
  loading,
}: {
  bullets: string[];
  source: "ai" | "rule";
  loading: boolean;
}) {
  if (!loading && bullets.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-800">Brand Analytics</h2>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
            source === "ai"
              ? "bg-violet-50 text-violet-600 ring-violet-200"
              : "bg-slate-50 text-slate-500 ring-slate-200"
          }`}
        >
          {source === "ai" ? "AI generated" : "Rule based"}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {source === "ai"
          ? "Written by Gemini from the same aggregates shown below."
          : "Generated directly from the numbers below — nothing here is inferred beyond the data."}
      </p>
      {loading ? (
        <ul className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${85 - i * 10}%` }} />
          ))}
        </ul>
      ) : (
        <ul className="mt-4 space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="mt-0.5 text-slate-400">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
