import type { TopicBreakdownRow } from "@/lib/analytics";

function prettyTopic(topic: string) {
  return topic
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function impactLabel(negative: number, total: number): { label: string; dot: string } {
  const pct = total ? negative / total : 0;
  if (negative >= 30 || pct >= 0.6) return { label: "Very high", dot: "bg-rose-500" };
  if (negative >= 12 || pct >= 0.4) return { label: "High", dot: "bg-amber-500" };
  if (negative > 0) return { label: "Medium", dot: "bg-amber-300" };
  return { label: "Low", dot: "bg-slate-300" };
}

export default function TopProblemsTable({ data }: { data: TopicBreakdownRow[] }) {
  const ranked = data
    .filter((t) => t.topic !== "off_topic" && t.negative > 0)
    .sort((a, b) => b.negative - a.negative)
    .slice(0, 6);

  if (ranked.length === 0) {
    return <p className="text-sm text-slate-500">No significant negative topics found.</p>;
  }

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full min-w-105 text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-2">Rank</th>
            <th className="py-2 pr-2">Issue</th>
            <th className="py-2 pr-2">Negative posts</th>
            <th className="py-2">Business impact</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((row, i) => {
            const impact = impactLabel(row.negative, row.total);
            return (
              <tr key={row.topic} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-2 text-slate-400">{i + 1}</td>
                <td className="py-2 pr-2 font-medium text-slate-800">{prettyTopic(row.topic)}</td>
                <td className="py-2 pr-2 text-slate-600">
                  {row.negative} <span className="text-slate-400">/ {row.total}</span>
                </td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${impact.dot}`} />
                    {impact.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
