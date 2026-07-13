import CompetitorPanel from "@/components/CompetitorPanel";
import { loadRecords } from "@/lib/loadRecords";
import { computeCompetitorInsight } from "@/lib/analytics";

export default function CompetitorPage() {
  const records = loadRecords();
  const insight = computeCompetitorInsight(records);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Competitor Analysis</h1>
      </header>

      {insight ? (
        <CompetitorPanel insight={insight} />
      ) : (
        <p className="text-sm text-slate-400">No competitor mentions found in the current data.</p>
      )}
    </div>
  );
}
