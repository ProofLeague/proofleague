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
import { useSend } from "../lib/hooks/use-send";

export function CommitmentCard() {
  const client = useAppClient();
  const connected = useConnectedWallet();
  const { cluster, getExplorerUrl } = useCluster();
  const { run, isSending } = useSend();
  const [matchId, setMatchId] = useState("world-cup-demo-001");
  const [agentId, setAgentId] = useState("proofleague-agent-1");
  const [prediction, setPrediction] = useState<PredictionChoice>("home");
  const [result, setResult] = useState<{ hash: string; signature: string }>();

  const handleCommit = async () => {
    const signer = connected?.signer;
    if (!signer || cluster !== "devnet" || !matchId || !agentId) return;

    const payload: PredictionPayload = {
      agentId,
      matchId,
      modelVersion: "proofleague-agent-v1",
      prediction,
      generatedAt: new Date().toISOString(),
    };
    const hash = await hashPrediction(payload);
    const signature = await run(
      () =>
        client.memo.instructions
          .addMemo({ memo: `proofleague:v1:${hash}`, signers: [signer] })
          .sendTransaction(),
      "Prediction committed to devnet"
    );

    if (signature) setResult({ hash, signature });
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

      <div className="mt-5 space-y-3">
        <input
          value={matchId}
          onChange={(event) => setMatchId(event.target.value)}
          aria-label="Match ID"
          placeholder="TxLINE match ID"
          className="w-full rounded-lg border border-border-low bg-background px-3 py-2.5 text-sm outline-none focus:border-green-400"
        />
        <input
          value={agentId}
          onChange={(event) => setAgentId(event.target.value)}
          aria-label="Agent ID"
          placeholder="Agent ID"
          className="w-full rounded-lg border border-border-low bg-background px-3 py-2.5 text-sm outline-none focus:border-green-400"
        />
        <div className="grid grid-cols-3 gap-2">
          {(["home", "draw", "away"] as PredictionChoice[]).map((choice) => (
            <button
              key={choice}
              onClick={() => setPrediction(choice)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium capitalize transition ${
                prediction === choice
                  ? "border-green-400 bg-green-400/15 text-green-300"
                  : "border-border-low bg-background hover:bg-cream"
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
        <button
          onClick={handleCommit}
          disabled={
            isSending ||
            !connected ||
            cluster !== "devnet" ||
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
                : "Commit prediction"}
        </button>
      </div>

      {result && (
        <div className="mt-5 space-y-2 rounded-xl border border-border-low bg-background/70 p-4 text-xs">
          <p className="text-muted">Canonical hash</p>
          <p className="break-all font-mono">{result.hash}</p>
          <a
            href={getExplorerUrl(`/tx/${result.signature}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-green-400 underline underline-offset-2"
          >
            Verify memo on Solana Explorer
          </a>
        </div>
      )}
    </section>
  );
}
