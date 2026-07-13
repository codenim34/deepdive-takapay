import { processRecords } from "./analytics";
import type { EnrichedInfo, ProcessedRecord, RawRecord } from "./types";
import rawData from "@/data/takapay.json";
import enrichedData from "@/data/enriched.json";

/** Shared by every page (dashboard, competitor analysis, feedback) so each
 *  route processes the same static dataset independently, without lifting
 *  state through a client-side provider. */
export function loadRecords(): ProcessedRecord[] {
  const enrichedMap = enrichedData as Record<number, EnrichedInfo>;
  return processRecords(rawData as RawRecord[], enrichedMap);
}
