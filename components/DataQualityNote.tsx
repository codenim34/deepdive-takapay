import type { DataQualityNotes } from "@/lib/analytics";

export default function DataQualityNote({ notes }: { notes: DataQualityNotes }) {
  return (
    <div className="rounded-xl border border-l-4 border-slate-200 border-l-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
      <p className="font-medium text-slate-700">A note on data quality</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          {notes.needsReview} of {notes.totalRecords} posts have a sentiment score or label that
          doesn&apos;t match their own text — see &ldquo;Needs human review&rdquo; below for the
          full list and why each was flagged. Nothing was silently corrected.
        </li>
        <li>
          {notes.duplicates} posts were near-duplicates of an earlier post. They&apos;re excluded
          from headline sentiment and topic totals so one repeated post can&apos;t inflate a
          trend.
        </li>
        <li>
          {notes.offTopic} posts were tagged &ldquo;off_topic&rdquo; (traffic, weather, unrelated
          chatter) despite being flagged as brand mentions. They&apos;re excluded from headline
          brand sentiment, shown as their own category in Topics.
        </li>
      </ul>
    </div>
  );
}

