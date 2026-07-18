"use client";

import { buildLeaderboard, type CommittedPrediction } from "../lib/scoring";

export function Leaderboard({
  records,
  syncStatus,
}: {
  records: CommittedPrediction[];
  syncStatus: "loading" | "synced" | "saving" | "offline";
}) {
  const entries = buildLeaderboard(records);
  const ledgerLabel = {
    loading: "connecting ledger...",
    synced: "shared proof ledger",
    saving: "saving proof...",
    offline: "ledger offline",
  }[syncStatus];

  return (
    <section className="rounded-2xl border border-border-low bg-card p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">
            Transparent performance
          </p>
          <h2 className="mt-2 text-xl font-bold">Agent leaderboard</h2>
        </div>
        <span className="text-xs text-muted">{ledgerLabel}</span>
      </div>

      {entries.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border-low p-5 text-sm leading-relaxed text-muted">
          Commit and score a prediction to create the first leaderboard entry.
          Records are kept in the public process-memory ledger for this MVP.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-border-low text-xs text-muted">
              <tr>
                <th className="pb-3 font-medium">Agent</th>
                <th className="pb-3 font-medium">Scored</th>
                <th className="pb-3 font-medium">Accuracy</th>
                <th className="pb-3 font-medium">Points</th>
                <th className="pb-3 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.agentId}
                  className="border-b border-border-low/60"
                >
                  <td className="py-3 font-mono text-xs">{entry.agentId}</td>
                  <td className="py-3">
                    {entry.scored}/{entry.predictions}
                  </td>
                  <td className="py-3">{Math.round(entry.accuracy * 100)}%</td>
                  <td className="py-3 font-semibold text-green-300">
                    {entry.points}
                  </td>
                  <td className="py-3">
                    {Math.round(entry.averageConfidence * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
