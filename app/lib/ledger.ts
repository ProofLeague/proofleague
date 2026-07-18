import type { CommittedPrediction } from "./scoring";

type LedgerState = {
  records: Map<string, CommittedPrediction>;
};

const globalLedger = globalThis as typeof globalThis & {
  __proofLeagueLedger?: LedgerState;
};

const state =
  globalLedger.__proofLeagueLedger ??
  (globalLedger.__proofLeagueLedger = { records: new Map() });

export function listLedgerRecords(): CommittedPrediction[] {
  return [...state.records.values()];
}

export function upsertLedgerRecord(
  record: CommittedPrediction
): CommittedPrediction {
  state.records.set(record.payload.matchId, record);
  return record;
}
