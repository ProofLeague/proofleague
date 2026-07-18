"use client";

import { useState } from "react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useCluster } from "./cluster-context";
import { useAppClient } from "../lib/client-provider";
import {
  hashPrediction,
  type PredictionChoice,
  type PredictionPayload,
} from "../lib/proof";
import {
  scoreCommittedPrediction,
  type CommittedPrediction,
  type ScoredPrediction,
} from "../lib/scoring";
import type { TxlineMatch } from "../lib/txline";
import type { AgentDraft } from "../lib/agent-draft";
import { useSend } from "../lib/hooks/use-send";

function isScoredRecord(
  record: CommittedPrediction | ScoredPrediction
): record is ScoredPrediction {
  return "outcome" in record;
}

type PendingCommitment = {
  payload: PredictionPayload;
  hash: string;
};

export function CommitmentCard({
  selectedMatch,
  agentDraft,
  onRecordChange,
}: {
  selectedMatch?: TxlineMatch;
  agentDraft?: AgentDraft;
  onRecordChange?: (record: CommittedPrediction) => void;
}) {
  const client = useAppClient();
  const connected = useConnectedWallet();
  const { cluster, getExplorerUrl } = useCluster();
  const { run, isSending } = useSend();
  const [matchId, setMatchId] = useState(
    agentDraft?.payload.matchId ?? "world-cup-demo-001"
  );
  const [agentId, setAgentId] = useState(
    agentDraft?.payload.agentId ?? "proofleague-agent-1"
  );
  const modelVersion =
    agentDraft?.payload.modelVersion ?? "proofleague-agent-v1";
  const [prediction, setPrediction] = useState<PredictionChoice>(
    agentDraft?.payload.prediction ?? "home"
  );
  const [confidence, setConfidence] = useState(
    String(agentDraft?.payload.confidence ?? 0.65)
  );
  const [generatedAt] = useState<string>(agentDraft?.payload.generatedAt ?? "");
  const [record, setRecord] = useState<
    CommittedPrediction | ScoredPrediction
  >();
  const [pendingCommitment, setPendingCommitment] =
    useState<PendingCommitment>();
  const draftMatchesSelection =
    !agentDraft ||
    !selectedMatch ||
    agentDraft.payload.matchId === selectedMatch.id;
  const pendingMatchesSelection =
    !pendingCommitment ||
    !selectedMatch ||
    pendingCommitment.payload.matchId === selectedMatch.id;

  const publishRecord = (nextRecord: CommittedPrediction) => {
    setRecord(nextRecord);
    onRecordChange?.(nextRecord);
  };

  const prepareCommit = async () => {
    const activeMatchId = selectedMatch?.id ?? matchId;
    if (cluster !== "devnet" || !activeMatchId || !agentId) return;

    const payload: PredictionPayload = {
      agentId,
      matchId: activeMatchId,
      modelVersion,
      prediction,
      confidence: Number(confidence),
      generatedAt: generatedAt || new Date().toISOString(),
    };
    const hash = await hashPrediction(payload);
    setPendingCommitment({ payload, hash });
  };

  const confirmCommit = async () => {
    const signer = connected?.signer;
    if (!signer || cluster !== "devnet" || !pendingCommitment) return;

    const signature = await run(
      () =>
        client.memo.instructions
          .addMemo({
            memo: "proofleague:v1:" + pendingCommitment.hash,
            signers: [signer],
          })
          .sendTransaction(),
      "Prediction committed to devnet"
    );

    if (signature) {
      publishRecord({
        payload: pendingCommitment.payload,
        hash: pendingCommitment.hash,
        signature,
      });
      setPendingCommitment(undefined);
    }
  };

  const handleReveal = () => {
    if (!record || !selectedMatch?.score || record.scoredAt) return;
    publishRecord(scoreCommittedPrediction(record, selectedMatch.score));
  };

  return (
    <section className="rounded-2xl border border-green-400/30 bg-green-400/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-400">
            Devnet commitment
          </p>
          <h2 className="mt-2 text-xl font-bold">Commit before kickoff</h2>
        </div>
        <span className="rounded-full border border-green-400/30 px-2.5 py-1 text-[11px] font-medium text-green-300">
          {cluster}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        The browser wallet signs a Memo transaction containing the SHA-256 hash.
        The payload stays reproducible for later reveal and scoring.
      </p>
      {agentDraft && (
        <p className="mt-3 rounded-lg border border-purple-300/30 bg-purple-300/5 p-3 text-xs text-purple-100">
          Private agent draft loaded: {agentDraft.reason}
        </p>
      )}
      {!draftMatchesSelection && (
        <p className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/5 p-3 text-xs text-amber-100">
          The selected match differs from the imported agent draft. Select{" "}
          {agentDraft?.payload.matchId} to preserve the verified payload hash.
        </p>
      )}

      <div className="mt-5 space-y-3">
        <input
          value={selectedMatch?.id ?? matchId}
          onChange={(event) => {
            setPendingCommitment(undefined);
            setMatchId(event.target.value);
          }}
          aria-label="Match ID"
          placeholder="TxLINE match ID"
          className="w-full rounded-lg border border-border-low bg-background px-3 py-2.5 text-sm outline-none focus:border-green-400"
        />
        <input
          value={agentId}
          onChange={(event) => {
            setPendingCommitment(undefined);
            setAgentId(event.target.value);
          }}
          aria-label="Agent ID"
          placeholder="Agent ID"
          className="w-full rounded-lg border border-border-low bg-background px-3 py-2.5 text-sm outline-none focus:border-green-400"
        />
        <div className="grid grid-cols-3 gap-2">
          {(["home", "draw", "away"] as PredictionChoice[]).map((choice) => (
            <button
              key={choice}
              onClick={() => {
                setPendingCommitment(undefined);
                setPrediction(choice);
              }}
              className={
                prediction === choice
                  ? "rounded-lg border border-green-400 bg-green-400/15 px-3 py-2.5 text-sm font-medium capitalize text-green-300 transition"
                  : "rounded-lg border border-border-low bg-background px-3 py-2.5 text-sm font-medium capitalize transition hover:bg-cream"
              }
            >
              {choice}
            </button>
          ))}
        </div>
        <label className="block text-xs text-muted">
          Confidence: {Math.round(Number(confidence) * 100)}%
          <input
            value={confidence}
            onChange={(event) => {
              setPendingCommitment(undefined);
              setConfidence(event.target.value);
            }}
            type="range"
            min="0.5"
            max="0.95"
            step="0.01"
            className="mt-2 w-full accent-green-400"
          />
        </label>
        <button
          onClick={() => void prepareCommit()}
          disabled={
            isSending ||
            !connected ||
            cluster !== "devnet" ||
            !draftMatchesSelection ||
            !matchId ||
            !agentId
          }
          className="w-full cursor-pointer rounded-lg bg-green-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-green-300 disabled:pointer-events-none disabled:opacity-50"
        >
          {!connected
            ? "Connect wallet to commit"
            : cluster !== "devnet"
              ? "Switch to devnet to commit"
              : isSending
                ? "Waiting for wallet..."
                : !draftMatchesSelection
                  ? "Select imported match to commit"
                  : "Review commitment"}
        </button>
      </div>

      {pendingCommitment && (
        <div className="mt-5 space-y-3 rounded-xl border border-amber-300/40 bg-amber-300/5 p-4 text-xs">
          <div>
            <p className="font-semibold text-amber-100">
              Review before wallet approval
            </p>
            <p className="mt-1 text-muted">
              This creates one devnet Memo transaction. No funds are
              transferred; your wallet will show the final fee and ask for
              approval.
            </p>
          </div>
          <dl className="space-y-1 text-muted">
            <div className="flex justify-between gap-4">
              <dt>Cluster</dt>
              <dd className="font-medium text-foreground">{cluster}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Match</dt>
              <dd className="font-medium text-foreground">
                {pendingCommitment.payload.matchId}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Prediction</dt>
              <dd className="font-medium capitalize text-foreground">
                {pendingCommitment.payload.prediction} ·{" "}
                {Math.round(pendingCommitment.payload.confidence * 100)}%
              </dd>
            </div>
          </dl>
          <div>
            <p className="text-muted">Memo</p>
            <p className="break-all font-mono text-[11px]">
              proofleague:v1:{pendingCommitment.hash}
            </p>
          </div>
          {!pendingMatchesSelection && (
            <p className="rounded-lg border border-red-300/30 bg-red-300/5 p-3 text-red-200">
              The selected match changed after this review. Rebuild the
              commitment before approving it.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPendingCommitment(undefined)}
              className="rounded-lg border border-border-low px-3 py-2 font-semibold text-muted transition hover:bg-background"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmCommit()}
              disabled={isSending || !pendingMatchesSelection || !connected}
              className="rounded-lg bg-amber-300 px-3 py-2 font-semibold text-black transition hover:bg-amber-200 disabled:pointer-events-none disabled:opacity-50"
            >
              {isSending ? "Waiting for wallet..." : "Approve in wallet"}
            </button>
          </div>
        </div>
      )}

      {record && (
        <div className="mt-5 space-y-3 rounded-xl border border-border-low bg-background/70 p-4 text-xs">
          <div>
            <p className="text-muted">Canonical hash</p>
            <p className="break-all font-mono">{record.hash}</p>
          </div>
          <a
            href={getExplorerUrl("/tx/" + record.signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-green-400 underline underline-offset-2"
          >
            Verify memo on Solana Explorer
          </a>
          {selectedMatch?.score && !record.scoredAt && (
            <button
              onClick={handleReveal}
              className="w-full rounded-lg border border-purple-300/60 px-3 py-2.5 text-sm font-semibold text-purple-200 transition hover:bg-purple-300/10"
            >
              Reveal and score TxLINE result ({selectedMatch.score.home}–
              {selectedMatch.score.away})
            </button>
          )}
          {record.scoredAt && isScoredRecord(record) && (
            <div className="rounded-lg border border-green-400/30 bg-green-400/5 p-3">
              <p className="font-semibold text-green-300">
                Scored: {record.correct ? "correct" : "incorrect"} ·{" "}
                {record.points} points
              </p>
              <p className="mt-1 text-muted">
                Outcome: {record.outcome} · Brier score:{" "}
                {record.brierScore.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
