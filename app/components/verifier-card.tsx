"use client";

import { useState } from "react";
import type { PredictionChoice } from "../lib/proof";

type VerificationResponse = {
  valid?: boolean;
  computedHash?: string;
  expectedHash?: string;
  error?: string;
};

export function VerifierCard() {
  const [agentId, setAgentId] = useState("proofleague-agent-1");
  const [matchId, setMatchId] = useState("");
  const [modelVersion, setModelVersion] = useState("proofleague-agent-v1");
  const [prediction, setPrediction] = useState<PredictionChoice>("home");
  const [confidence, setConfidence] = useState("0.65");
  const [generatedAt, setGeneratedAt] = useState("");
  const [expectedHash, setExpectedHash] = useState("");
  const [response, setResponse] = useState<VerificationResponse>();
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    setResponse(undefined);

    try {
      const result = await fetch("/api/proof/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          payload: {
            agentId,
            matchId,
            modelVersion,
            prediction,
            confidence: Number(confidence),
            generatedAt,
          },
          expectedHash: expectedHash.trim(),
        }),
      });
      setResponse((await result.json()) as VerificationResponse);
    } catch {
      setResponse({ error: "Verifier request failed." });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border-low bg-card p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
          Public verification
        </p>
        <h2 className="mt-2 text-xl font-bold">Check a prediction hash</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Re-enter the committed payload and compare its SHA-256 digest with the
          value recorded in the Solana Memo.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input
          value={agentId}
          onChange={(event) => setAgentId(event.target.value)}
          aria-label="Verifier agent ID"
          placeholder="Agent ID"
          className="rounded-lg border border-border-low bg-background px-3 py-2.5 text-sm outline-none focus:border-blue-300"
        />
        <input
          value={matchId}
          onChange={(event) => setMatchId(event.target.value)}
          aria-label="Verifier match ID"
          placeholder="Match ID"
          className="rounded-lg border border-border-low bg-background px-3 py-2.5 text-sm outline-none focus:border-blue-300"
        />
        <input
          value={modelVersion}
          onChange={(event) => setModelVersion(event.target.value)}
          aria-label="Verifier model version"
          placeholder="Model version"
          className="rounded-lg border border-border-low bg-background px-3 py-2.5 text-sm outline-none focus:border-blue-300"
        />
        <input
          value={generatedAt}
          onChange={(event) => setGeneratedAt(event.target.value)}
          aria-label="Verifier generated at"
          placeholder="Generated at (ISO timestamp)"
          className="rounded-lg border border-border-low bg-background px-3 py-2.5 text-sm outline-none focus:border-blue-300"
        />
        <div className="grid grid-cols-3 gap-2">
          {(["home", "draw", "away"] as PredictionChoice[]).map((choice) => (
            <button
              key={choice}
              onClick={() => setPrediction(choice)}
              className={
                prediction === choice
                  ? "rounded-lg border border-blue-300 bg-blue-300/15 px-3 py-2.5 text-sm font-medium capitalize text-blue-200"
                  : "rounded-lg border border-border-low bg-background px-3 py-2.5 text-sm font-medium capitalize"
              }
            >
              {choice}
            </button>
          ))}
        </div>
        <input
          value={confidence}
          onChange={(event) => setConfidence(event.target.value)}
          aria-label="Verifier confidence"
          inputMode="decimal"
          placeholder="Confidence, e.g. 0.65"
          className="rounded-lg border border-border-low bg-background px-3 py-2.5 text-sm outline-none focus:border-blue-300"
        />
      </div>

      <input
        value={expectedHash}
        onChange={(event) => setExpectedHash(event.target.value)}
        aria-label="Expected SHA-256 hash"
        placeholder="Expected SHA-256 hash from the Memo"
        className="mt-3 w-full rounded-lg border border-border-low bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-blue-300"
      />
      <button
        onClick={handleVerify}
        disabled={
          isVerifying ||
          !agentId ||
          !matchId ||
          !modelVersion ||
          !generatedAt ||
          !expectedHash
        }
        className="mt-3 w-full rounded-lg border border-blue-300/60 px-4 py-2.5 text-sm font-semibold text-blue-200 transition hover:bg-blue-300/10 disabled:pointer-events-none disabled:opacity-50"
      >
        {isVerifying ? "Verifying..." : "Verify prediction"}
      </button>

      {response && (
        <div
          className={
            response.valid
              ? "mt-4 rounded-xl border border-green-400/40 bg-green-400/5 p-4 text-sm"
              : "mt-4 rounded-xl border border-red-400/40 bg-red-400/5 p-4 text-sm"
          }
        >
          {response.error ? (
            <p>{response.error}</p>
          ) : (
            <>
              <p className="font-semibold">
                {response.valid
                  ? "Hash matches the payload."
                  : "Hash does not match the payload."}
              </p>
              <p className="mt-2 break-all font-mono text-xs text-muted">
                Computed: {response.computedHash}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
