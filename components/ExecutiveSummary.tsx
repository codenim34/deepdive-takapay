export default function ExecutiveSummary({ bullets }: { bullets: string[] }) {
  if (bullets.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">Brand Health Summary</h2>
      <p className="mt-1 text-xs text-slate-400">
        Generated directly from the numbers below — nothing here is inferred beyond the data.
      </p>
      <ul className="mt-4 space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-700">
            <span className="mt-0.5 text-slate-400">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
