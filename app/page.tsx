import Dashboard from "@/components/Dashboard";
import { processRecords } from "@/lib/analytics";
import type { EnrichedInfo, RawRecord } from "@/lib/types";
import rawData from "@/data/takapay.json";
import enrichedData from "@/data/enriched.json";

export default function Home() {
  // data/enriched.json is {} until scripts/enrich.mjs has been run with a
  // GEMINI_API_KEY locally. The dashboard works identically either way —
  // this just swaps in AI-written explanations for the review queue when
  // available, with no runtime dependency on any external API.
  const enrichedMap = enrichedData as Record<number, EnrichedInfo>;
  const records = processRecords(rawData as RawRecord[], enrichedMap);
  return (
    <main className="min-h-screen bg-slate-50">
      <Dashboard records={records} />
    </main>
  );
}
