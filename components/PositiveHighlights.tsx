import type { PositiveHighlight } from "@/lib/analytics";

function prettyTopic(topic: string) {
  return topic
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default function PositiveHighlights({ highlights }: { highlights: PositiveHighlight[] }) {
  if (highlights.length === 0) return null;

  return (
    <div className="rounded-xl border border-l-4 border-slate-200 border-l-emerald-400 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">What&apos;s working</h2>
      <p className="mt-1 text-sm text-slate-500">
        Topics generating the most positive feedback — worth amplifying in marketing.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {highlights.map((h) => (
          <div key={h.topic} className="rounded-lg bg-emerald-50 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-emerald-800">{prettyTopic(h.topic)}</span>
              <span className="text-xs text-emerald-600">{h.count} positive posts</span>
            </div>
            <p className="mt-1 text-sm text-emerald-900/80">&ldquo;{h.sampleQuote.text}&rdquo;</p>
          </div>
        ))}
      </div>
    </div>
  );
}
