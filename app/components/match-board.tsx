"use client";

import { useEffect, useState } from "react";
import type { TxlineMatch } from "../lib/txline";

type MatchResponse = {
  configured: boolean;
  matches: TxlineMatch[];
  error?: string;
};

export function MatchBoard() {
  const [state, setState] = useState<MatchResponse>();

  useEffect(() => {
    let active = true;
    fetch("/api/txline/matches", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as MatchResponse;
        if (active) setState(body);
      })
      .catch(() => {
        if (active) {
          setState({
            configured: false,
            matches: [],
            error: "Could not reach the TxLINE adapter",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-border-low bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">
            Live match feed
          </p>
          <h2 className="mt-2 text-xl font-bold">TxLINE fixtures</h2>
        </div>
        <span className="rounded-full border border-border-low px-2.5 py-1 text-[11px] text-muted">
          server adapter
        </span>
      </div>

      {!state && (
        <p className="mt-8 text-sm text-muted">Connecting to TxLINE…</p>
      )}

      {state && state.matches.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-border-low p-5">
          <p className="text-sm font-medium">
            {state.configured
              ? "No fixtures returned"
              : "TxLINE adapter is not configured"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {state.error ??
              "Add TXLINE_API_URL to .env.local and restart the dev server."}
          </p>
        </div>
      )}

      {state && state.matches.length > 0 && (
        <div className="mt-6 space-y-3">
          {state.matches.map((match) => (
            <article
              key={match.id}
              className="rounded-xl border border-border-low p-4"
            >
              <div className="flex items-center justify-between gap-3 text-xs text-muted">
                <span className="font-mono">{match.id}</span>
                <span className="capitalize">{match.status}</span>
              </div>
              <p className="mt-3 text-base font-semibold">
                {match.homeTeam} <span className="text-muted">vs</span>{" "}
                {match.awayTeam}
              </p>
              <p className="mt-1 text-xs text-muted">
                {new Date(match.kickoffAt).toLocaleString()}
                {match.score
                  ? ` · ${match.score.home}–${match.score.away}`
                  : ""}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
