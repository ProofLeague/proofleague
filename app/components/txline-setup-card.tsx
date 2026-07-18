"use client";

import { useEffect, useState } from "react";

type TxlineStatus = {
  freeTier: boolean;
  apiConfigured: boolean;
  sessionJwtConfigured: boolean;
  apiTokenConfigured: boolean;
  scoresConfigured: boolean;
  readyForFixtures: boolean;
};

const steps = [
  ["apiConfigured", "Fixture endpoint"],
  ["sessionJwtConfigured", "Session JWT"],
  ["apiTokenConfigured", "Activated API token"],
  ["scoresConfigured", "Score endpoint"],
] as const;

export function TxlineSetupCard() {
  const [status, setStatus] = useState<TxlineStatus>();

  useEffect(() => {
    fetch("/api/txline/status", { cache: "no-store" })
      .then((response) => response.json() as Promise<TxlineStatus>)
      .then(setStatus)
      .catch(() => setStatus(undefined));
  }, []);

  if (status?.readyForFixtures && status.scoresConfigured) return null;

  return (
    <section className="rounded-2xl border border-purple-300/30 bg-purple-300/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">
            Free TxLINE setup
          </p>
          <h2 className="mt-2 text-lg font-bold">Connect the World Cup feed</h2>
        </div>
        <span className="rounded-full border border-purple-300/40 px-2.5 py-1 text-[11px] text-purple-200">
          no paid plan
        </span>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        The World Cup free tier does not require a TxL purchase or credit card.
        It only needs a devnet wallet transaction fee and the resulting server
        credentials.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {steps.map(([key, label]) => {
          const ready = status?.[key] ?? false;
          return (
            <div
              key={key}
              className="flex items-center gap-2 rounded-lg border border-border-low bg-background/50 px-3 py-2 text-xs"
            >
              <span className={ready ? "text-green-300" : "text-muted"}>
                {ready ? "✓" : "○"}
              </span>
              <span className={ready ? "text-foreground" : "text-muted"}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <a
          href="https://txline.txodds.com/documentation/worldcup"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-200 underline underline-offset-2"
        >
          Free-tier activation guide
        </a>
        <a
          href="https://faucet.solana.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-300 underline underline-offset-2"
        >
          Get devnet SOL
        </a>
      </div>
    </section>
  );
}
