"use client";

import { useState } from "react";

type CredentialKey = "sessionJwt" | "apiToken";

export function TxlineCredentialHandoff() {
  const [copied, setCopied] = useState<CredentialKey>();
  const [error, setError] = useState<string>();

  const copyCredential = async (key: CredentialKey) => {
    setError(undefined);
    try {
      const response = await fetch("/api/txline/activation/export", {
        cache: "no-store",
      });
      const body = (await response.json()) as {
        sessionJwt?: string;
        apiToken?: string;
        error?: string;
      };
      if (!response.ok || !body[key]) {
        throw new Error(
          body.error ?? "Could not read local TxLINE credentials."
        );
      }
      await navigator.clipboard.writeText(body[key]);
      setCopied(key);
    } catch (handoffError) {
      setError(
        handoffError instanceof Error
          ? handoffError.message
          : "Could not copy the local credential."
      );
    }
  };

  return (
    <div className="rounded-xl border border-amber-300/40 bg-amber-300/5 p-4 text-xs">
      <p className="font-semibold text-amber-100">Local Vercel handoff</p>
      <p className="mt-2 leading-relaxed text-muted">
        This helper exists only on localhost during development. Copy each value
        directly into Vercel Environment Variables. The values are never
        displayed in the page, committed, or returned by production.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["sessionJwt", "Copy TXLINE_SESSION_JWT"],
            ["apiToken", "Copy TXLINE_API_TOKEN"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => void copyCredential(key)}
            className="rounded-lg border border-amber-300/50 px-3 py-2 font-semibold text-amber-100 transition hover:bg-amber-300/10"
          >
            {copied === key ? "Copied — paste now" : label}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-red-200">{error}</p>}
    </div>
  );
}
