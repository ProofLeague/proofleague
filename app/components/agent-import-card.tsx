"use client";

import { useState } from "react";
import {
  hashPrediction,
  type PredictionChoice,
  type PredictionPayload,
} from "../lib/proof";
import type { AgentDraft } from "../lib/agent-draft";

const choices = new Set<PredictionChoice>(["home", "draw", "away"]);

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

export function AgentImportCard({
  onImport,
}: {
  onImport: (draft: AgentDraft) => void;
}) {
  const [json, setJson] = useState("");
  const [error, setError] = useState<string>();
  const [loaded, setLoaded] = useState<AgentDraft>();
  const [isChecking, setIsChecking] = useState(false);

  const handleImport = async () => {
    setError(undefined);
    setLoaded(undefined);
    setIsChecking(true);

    try {
      const parsed = JSON.parse(json) as {
        payload?: unknown;
        hash?: unknown;
        reason?: unknown;
        predictions?: Array<{
          payload?: unknown;
          hash?: unknown;
          reason?: unknown;
        }>;
      };
      const candidate = parsed.predictions?.[0] ?? parsed;
      if (!isPredictionPayload(candidate.payload)) {
        throw new Error("JSON icindeki prediction payload gecersiz.");
      }
      if (
        typeof candidate.hash !== "string" ||
        !/^[a-f0-9]{64}$/i.test(candidate.hash)
      ) {
        throw new Error("Agent hash 64 karakterlik SHA-256 hex olmali.");
      }

      const computedHash = await hashPrediction(candidate.payload);
      if (computedHash.toLowerCase() !== candidate.hash.toLowerCase()) {
        throw new Error(
          "Hash payload ile eslesmiyor; agent cikti degismis olabilir."
        );
      }

      const draft = {
        payload: candidate.payload,
        hash: computedHash,
        reason:
          typeof candidate.reason === "string"
            ? candidate.reason
            : "Private agent prediction verified locally.",
      } satisfies AgentDraft;
      setLoaded(draft);
      onImport(draft);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "JSON import edilemedi."
      );
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <section className="rounded-2xl border border-purple-300/30 bg-purple-300/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-200">
        Private agent bridge
      </p>
      <h2 className="mt-2 text-xl font-bold">Import an agent prediction</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Paste the JSON emitted by the private run-once agent. The browser
        recomputes the canonical hash before loading it into the wallet
        commitment form; the agent&apos;s reasoning stays out of the public
        repo.
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
        {isChecking ? "Verifying hash..." : "Verify and load prediction"}
      </button>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      {loaded && (
        <p className="mt-3 text-sm text-green-300">
          Verified {loaded.payload.prediction} prediction for{" "}
          {loaded.payload.matchId}.
        </p>
      )}
    </section>
  );
}
