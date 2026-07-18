"use client";

import { useState } from "react";
import { useSignMessage } from "@solana/kit-plugin-wallet/react";
import { useCluster } from "./cluster-context";

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...Array.from(bytes)));
}

export function TxlineActivationCard() {
  const { cluster } = useCluster();
  const { dispatchAsync, isRunning } = useSignMessage();
  const [txSig, setTxSig] = useState("");
  const [setupId, setSetupId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [state, setState] = useState<"idle" | "ready" | "activated" | "error">(
    "idle"
  );
  const [error, setError] = useState<string>();

  const prepare = async () => {
    if (cluster !== "devnet" || !txSig.trim()) return;
    setError(undefined);
    setState("idle");
    try {
      const response = await fetch("/api/txline/activation/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txSig: txSig.trim() }),
      });
      const body = (await response.json()) as {
        setupId?: string;
        message?: string;
        error?: string;
      };
      if (!response.ok || !body.setupId || !body.message) {
        throw new Error(body.error ?? "Could not prepare TxLINE activation.");
      }
      setSetupId(body.setupId);
      setMessage(body.message);
      setState("ready");
    } catch (activationError) {
      setError(
        activationError instanceof Error
          ? activationError.message
          : "Could not prepare TxLINE activation."
      );
      setState("error");
    }
  };

  const signAndActivate = async () => {
    if (!setupId || !message || cluster !== "devnet") return;
    setError(undefined);
    try {
      const signature = await dispatchAsync(new TextEncoder().encode(message));
      const response = await fetch("/api/txline/activation/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupId,
          txSig: txSig.trim(),
          walletSignature: toBase64(signature),
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Could not complete TxLINE activation.");
      }
      setState("activated");
      window.setTimeout(() => window.location.reload(), 800);
    } catch (activationError) {
      setError(
        activationError instanceof Error
          ? activationError.message
          : "Wallet signature or TxLINE activation failed."
      );
      setState("error");
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-border-low bg-background/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        Wallet activation helper
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        First complete the free devnet subscription from the guide above, then
        paste its Solana transaction signature here. The app will request a
        wallet message signature; it will not ask for a private key.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        This helper does not create or send the subscription transaction. It
        only activates the API after you approve that transaction yourself.
      </p>
      <input
        value={txSig}
        onChange={(event) => setTxSig(event.target.value)}
        placeholder="Devnet subscription transaction signature"
        aria-label="TxLINE subscription transaction signature"
        className="mt-3 w-full rounded-lg border border-border-low bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-purple-300"
      />
      {state === "ready" && (
        <p className="mt-3 rounded-lg border border-purple-300/30 bg-purple-300/5 p-3 text-xs text-purple-100">
          Activation message prepared. It includes a short-lived server session
          token and should only be signed for this TxLINE activation.
        </p>
      )}
      {state === "activated" && (
        <p className="mt-3 rounded-lg border border-green-400/30 bg-green-400/5 p-3 text-xs text-green-200">
          Free-tier API activated in this local server. Reloading the fixture
          feed…
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg border border-red-300/30 bg-red-300/5 p-3 text-xs text-red-200">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void prepare()}
          disabled={cluster !== "devnet" || !txSig.trim() || isRunning}
          className="rounded-lg border border-purple-300/50 px-3 py-2 text-xs font-semibold text-purple-100 transition hover:bg-purple-300/10 disabled:pointer-events-none disabled:opacity-50"
        >
          Prepare activation
        </button>
        <button
          type="button"
          onClick={() => void signAndActivate()}
          disabled={
            cluster !== "devnet" ||
            !setupId ||
            !message ||
            isRunning ||
            state === "activated"
          }
          className="rounded-lg bg-purple-300 px-3 py-2 text-xs font-semibold text-black transition hover:bg-purple-200 disabled:pointer-events-none disabled:opacity-50"
        >
          {isRunning ? "Waiting for wallet…" : "Sign and activate"}
        </button>
      </div>
      {cluster !== "devnet" && (
        <p className="mt-2 text-xs text-muted">
          Switch the app to devnet first.
        </p>
      )}
    </div>
  );
}
