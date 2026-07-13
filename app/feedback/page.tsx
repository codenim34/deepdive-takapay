import FeedbackList from "@/components/FeedbackList";
import { loadRecords } from "@/lib/loadRecords";
import { reviewQueue } from "@/lib/analytics";

export default function FeedbackPage() {
  const records = loadRecords();
  const flagged = reviewQueue(records);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Review Queue</h1>
        <p className="mt-1 text-sm text-slate-500">{flagged.length} posts flagged for sentiment review.</p>
      </header>

      <FeedbackList records={flagged} />
    </div>
  );
}
