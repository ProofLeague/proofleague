"use client";

import { useState } from "react";
import {
  hashPrediction,
  type PredictionChoice,
  type PredictionPayload,
} from "../lib/proof";
import type { AgentDraft } from "../lib/agent-draft";

const choices = new Set<PredictionChoice>(["home", "draw", "away"]);

type RawAgentPrediction = {
  payload?: unknown;
  hash?: unknown;
  reason?: unknown;
};

function isPredictionPayload(value: unknown): value is PredictionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<PredictionPayload>;
  return (
    typeof payload.agentId === "string" &&
    typeof payload.matchId === "string" &&
    typeof payload.modelVersion === "string" &&
    typeof payload.prediction === "string" &&
    choices.has(payload.prediction as PredictionChoice) &&
    typeof payload.confidence === "number" &&
    payload.confidence >= 0 &&
    payload.confidence <= 1 &&
    typeof payload.generatedAt === "string"
  );
}

async function verifyAgentDraft(
  candidate: RawAgentPrediction,
  index: number
): Promise<AgentDraft> {
  if (!isPredictionPayload(candidate.payload)) {
    throw new Error(`Prediction ${index + 1} icindeki payload gecersiz.`);
  }
  if (
    typeof candidate.hash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(candidate.hash)
  ) {
    throw new Error(
      `Prediction ${index + 1} hash 64 karakterlik SHA-256 hex olmali.`
    );
  }

  const computedHash = await hashPrediction(candidate.payload);
  if (computedHash.toLowerCase() !== candidate.hash.toLowerCase()) {
    throw new Error(
      `Prediction ${index + 1} hash ile payload eslesmiyor; agent ciktisi degismis olabilir.`
    );
  }

  return {
    payload: candidate.payload,
    hash: computedHash,
    reason:
      typeof candidate.reason === "string"
        ? candidate.reason
        : "Private agent prediction verified locally.",
  };
}

export function AgentImportCard({
  onImport,
}: {
  onImport: (draft: AgentDraft) => void;
}) {
  const [json, setJson] = useState("");
  const [error, setError] = useState<string>();
  const [drafts, setDrafts] = useState<AgentDraft[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loaded, setLoaded] = useState<AgentDraft>();
  const [isChecking, setIsChecking] = useState(false);

  const handleImport = async () => {
    setError(undefined);
    setLoaded(undefined);
    setDrafts([]);
    setIsChecking(true);

    try {
      const parsed = JSON.parse(json) as RawAgentPrediction & {
        predictions?: RawAgentPrediction[];
      };
      const candidates = Array.isArray(parsed.predictions)
        ? parsed.predictions
        : [parsed];
      if (candidates.length === 0) {
        throw new Error("JSON icinde prediction bulunamadi.");
      }
      const verifiedDrafts = await Promise.all(
        candidates.map((candidate, index) => verifyAgentDraft(candidate, index))
      );
      setDrafts(verifiedDrafts);
      setSelectedIndex(0);
      setLoaded(verifiedDrafts[0]);
      onImport(verifiedDrafts[0]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "JSON import edilemedi."
      );
    } finally {
      setIsChecking(false);
    }
  };

  const handleSelect = (value: string) => {
    const nextIndex = Number(value);
    const nextDraft = drafts[nextIndex];
    if (!nextDraft) return;
    setSelectedIndex(nextIndex);
    setLoaded(nextDraft);
    onImport(nextDraft);
  };

  return (
    <section className="rounded-2xl border border-purple-300/30 bg-purple-300/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-200">
        Private agent bridge
      </p>
      <h2 className="mt-2 text-xl font-bold">Import agent predictions</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Paste the JSON emitted by the private run-once agent. The browser
        recomputes every canonical hash before loading one prediction into the
        wallet commitment form; the agent&apos;s reasoning stays out of the
        public repo.
      </p>
      <textarea
        value={json}
        onChange={(event) => setJson(event.target.value)}
        aria-label="Private agent JSON"
        placeholder={
          '{"predictions":[{"payload":{...},"hash":"...","reason":"..."}]}'
        }
        rows={5}
        className="mt-4 w-full rounded-lg border border-border-low bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-purple-300"
      />
      <button
        onClick={handleImport}
        disabled={isChecking || !json.trim()}
        className="mt-3 w-full rounded-lg border border-purple-300/60 px-4 py-2.5 text-sm font-semibold text-purple-100 transition hover:bg-purple-300/10 disabled:pointer-events-none disabled:opacity-50"
      >
        {isChecking ? "Verifying hashes..." : "Verify and load predictions"}
      </button>
      {drafts.length > 1 && (
        <label className="mt-3 block text-xs text-muted">
          Verified matches ({drafts.length})
          <select
            value={selectedIndex}
            onChange={(event) => handleSelect(event.target.value)}
            aria-label="Verified agent predictions"
            className="mt-2 w-full rounded-lg border border-border-low bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-purple-300"
          >
            {drafts.map((draft, index) => (
              <option key={draft.hash} value={index}>
                {draft.payload.matchId} · {draft.payload.prediction} ·{" "}
                {Math.round(draft.payload.confidence * 100)}%
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      {loaded && (
        <p className="mt-3 text-sm text-green-300">
          Verified {drafts.length} predictions; loaded{" "}
          {loaded.payload.prediction} for {loaded.payload.matchId}.
        </p>
      )}
    </section>
  );
}
