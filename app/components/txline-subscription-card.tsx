"use client";

import { useState } from "react";
import type { Address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useCluster } from "./cluster-context";
import { useAppClient } from "../lib/client-provider";
import {
  createTxlineSubscriptionInstructions,
  TXLINE_DEVNET_PROGRAM_ID,
} from "../lib/txline-subscription";
import { useSend } from "../lib/hooks/use-send";

type PendingSubscription = {
  instructions: Awaited<
    ReturnType<typeof createTxlineSubscriptionInstructions>
  >["instructions"];
};

export function TxlineSubscriptionCard({
  onCreated,
}: {
  onCreated?: (signature: string) => void;
}) {
  const client = useAppClient();
  const connected = useConnectedWallet();
  const { cluster } = useCluster();
  const { run, isSending } = useSend();
  const [pending, setPending] = useState<PendingSubscription>();
  const [signature, setSignature] = useState<string>();
  const [error, setError] = useState<string>();

  const prepare = async () => {
    if (cluster !== "devnet" || !connected?.account.address) return;
    setError(undefined);
    try {
      const plan = await createTxlineSubscriptionInstructions(
        connected.account.address as Address
      );
      setPending({ instructions: plan.instructions });
    } catch (preparationError) {
      setError(
        preparationError instanceof Error
          ? preparationError.message
          : "Could not prepare the TxLINE subscription."
      );
    }
  };

  const confirm = async () => {
    if (!pending || cluster !== "devnet" || !connected?.signer) return;
    setError(undefined);
    const result = await run(
      () => client.sendTransaction(pending.instructions),
      "TxLINE free-tier subscription confirmed"
    );
    if (result) {
      setSignature(result);
      setPending(undefined);
      onCreated?.(result);
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
        Step 1 · Create free subscription
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        This prepares the official TxLINE devnet subscription: service level 1,
        four weeks, and the standard empty league list. No TxL is transferred;
        your wallet only pays the Solana network fee and possible account rent.
      </p>
      <dl className="mt-3 space-y-1 text-xs text-muted">
        <div className="flex justify-between gap-4">
          <dt>Network</dt>
          <dd className="font-medium text-foreground">Solana devnet</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Program</dt>
          <dd className="font-mono text-[10px] text-foreground">
            {TXLINE_DEVNET_PROGRAM_ID}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Subscription</dt>
          <dd className="font-medium text-foreground">Level 1 · 4 weeks</dd>
        </div>
      </dl>
      {pending && (
        <div className="mt-4 rounded-lg border border-amber-300/30 bg-background/40 p-3 text-xs text-amber-100">
          Review complete. The next button opens your wallet for approval. No
          transaction is sent until you approve it.
        </div>
      )}
      {signature && (
        <p className="mt-4 break-all rounded-lg border border-green-400/30 bg-green-400/5 p-3 font-mono text-[11px] text-green-200">
          Subscription confirmed: {signature}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-300/30 bg-red-300/5 p-3 text-xs text-red-200">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {!pending && !signature && (
          <button
            type="button"
            onClick={() => void prepare()}
            disabled={cluster !== "devnet" || !connected?.signer || isSending}
            className="rounded-lg border border-amber-300/50 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/10 disabled:pointer-events-none disabled:opacity-50"
          >
            Review subscription
          </button>
        )}
        {pending && (
          <>
            <button
              type="button"
              onClick={() => setPending(undefined)}
              className="rounded-lg border border-border-low px-3 py-2 text-xs font-semibold text-muted transition hover:bg-background"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={isSending || !connected?.signer}
              className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-semibold text-black transition hover:bg-amber-200 disabled:pointer-events-none disabled:opacity-50"
            >
              {isSending ? "Waiting for wallet…" : "Approve in wallet"}
            </button>
          </>
        )}
      </div>
      {cluster !== "devnet" && (
        <p className="mt-2 text-xs text-muted">
          Switch the app to devnet first.
        </p>
      )}
      {!connected?.signer && (
        <p className="mt-2 text-xs text-muted">
          Connect a signing wallet to prepare the subscription.
        </p>
      )}
    </div>
  );
}
