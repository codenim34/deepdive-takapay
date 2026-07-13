import type { ProcessedRecord, ReviewFlag } from "@/lib/types";

const FLAG_LABELS: Record<ReviewFlag, string> = {
  label_score_mismatch: "Label disagrees with score",
  suspected_score_error: "Score looks wrong for this text",
};

function deterministicReason(r: ProcessedRecord): string {
  if (r.reviewFlags.includes("suspected_score_error")) {
    return `Scored ${r.sentiment_score}/100 (${r.sentiment}), but the text contains clear complaint language (money deducted, unresolved support). Likely a scoring error.`;
  }
  return `Labeled "${r.sentiment}" but the score (${r.sentiment_score}/100) maps to "${r.sentimentBucket}". The two disagree.`;
}

export default function ReviewQueuePanel({ records }: { records: ProcessedRecord[] }) {
  const visible = records.slice(0, 15);
  const remaining = records.length - visible.length;

  return (
    <div className="rounded-xl border border-l-4 border-slate-200 border-l-amber-400 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-800">Needs human review</h2>
        <span className="text-sm text-slate-500">{records.length} posts flagged</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        These posts have a sentiment score or label that doesn&apos;t match their own text. Shown
        here instead of silently corrected, sorted by urgency.
      </p>

      {records.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Nothing flagged for review.</p>
      ) : (
        <div className="mt-4 max-h-105 space-y-3 overflow-y-auto pr-1">
          {visible.map((r) => (
            <div key={r.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {r.reviewFlags.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-300"
                  >
                    {FLAG_LABELS[f]}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm text-slate-800">&ldquo;{r.text}&rdquo;</p>
              <p className="mt-1 text-xs text-slate-500">
                {r.enriched ? r.enriched.reason : deterministicReason(r)}
              </p>
              {r.enriched && (
                <p className="mt-1 text-xs text-slate-400">
                  AI-suggested correction: {r.enriched.correctedSentiment} (
                  {r.enriched.confidence}% confidence)
                </p>
              )}
            </div>
          ))}
          {remaining > 0 && (
            <p className="text-center text-xs text-slate-400">+{remaining} more not shown</p>
          )}
        </div>
      )}
    </div>
  );
}
