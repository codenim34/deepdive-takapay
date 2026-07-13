"use client";

import { useState } from "react";
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

type RowState = "pending" | "accepted" | "discarded";

function FeedbackRow({ r }: { r: ProcessedRecord }) {
  const [state, setState] = useState<RowState>("pending");

  if (r.enriched) {
    return (
      <div className="rounded-lg border border-l-4 border-emerald-200 border-l-emerald-400 bg-emerald-50/40 p-4">
        <p className="text-sm text-slate-800">&ldquo;{r.text}&rdquo;</p>
        <p className="mt-2 text-xs text-emerald-700">
          <span className="font-medium">Already resolved:</span> confirmed as {r.enriched.correctedSentiment}{" "}
          — {r.enriched.reason}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-l-4 p-4 ${
        state === "discarded"
          ? "border-slate-200 border-l-slate-300 bg-slate-50"
          : state === "accepted"
            ? "border-emerald-200 border-l-emerald-400 bg-emerald-50/40"
            : "border-amber-200 border-l-amber-400 bg-amber-50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {r.reviewFlags.map((f) => (
          <span
            key={f}
            className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-300"
          >
            {FLAG_LABELS[f]}
          </span>
        ))}
        <span className="text-xs text-slate-400">
          {r.platform} · {r.reactions} reactions · {r.comments} comments
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-800">&ldquo;{r.text}&rdquo;</p>
      <p className="mt-1 text-xs text-slate-500">{deterministicReason(r)}</p>

      {state === "discarded" ? (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-slate-400">Discarded as irrelevant.</p>
          <button
            type="button"
            onClick={() => setState("pending")}
            className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
          >
            Undo
          </button>
        </div>
      ) : state === "accepted" ? (
        <p className="mt-2 text-xs text-emerald-700">Accepted.</p>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setState("accepted")}
            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => setState("discarded")}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Discard
          </button>
        </div>
      )}
    </div>
  );
}

export default function FeedbackList({ records }: { records: ProcessedRecord[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-slate-400">Nothing flagged for review.</p>;
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <FeedbackRow key={r.id} r={r} />
      ))}
    </div>
  );
}
