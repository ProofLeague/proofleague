"use client";

import { useEffect, useState } from "react";
import { CommitmentCard } from "./components/commitment-card";
import { Leaderboard } from "./components/leaderboard";
import { MatchBoard } from "./components/match-board";
import { VerifierCard } from "./components/verifier-card";
import type { CommittedPrediction } from "./lib/scoring";
import type { TxlineMatch } from "./lib/txline";

export default function Home() {
  const [selectedMatch, setSelectedMatch] = useState<TxlineMatch>();
  const [records, setRecords] = useState<CommittedPrediction[]>([]);
  const [ledgerStatus, setLedgerStatus] = useState<
    "loading" | "synced" | "saving" | "offline"
  >("loading");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/ledger")
      .then(async (response) => {
        if (!response.ok) throw new Error("Ledger request failed");
        return (await response.json()) as {
          records?: CommittedPrediction[];
        };
      })
      .then((data) => {
        if (cancelled) return;
        setRecords(data.records ?? []);
        setLedgerStatus("synced");
      })
      .catch(() => {
        if (!cancelled) setLedgerStatus("offline");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRecordChange = (record: CommittedPrediction) => {
    setRecords((current) => {
      return [
        ...current.filter(
          (item) =>
            item.hash !== record.hash &&
            item.payload.matchId !== record.payload.matchId
        ),
        record,
      ];
    });

    setLedgerStatus("saving");
    void fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Ledger write failed");
        setLedgerStatus("synced");
      })
      .catch(() => setLedgerStatus("offline"));
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green-400">
          TxODDS World Cup Hackathon · devnet proof layer
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
          Predictions you can verify.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/60 sm:text-lg">
          ProofLeague reads live TxLINE match data, commits an agent&apos;s
          home/draw/away prediction before kickoff, and makes the hash and
          Solana transaction public.
        </p>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <MatchBoard
          selectedMatchId={selectedMatch?.id}
          onSelectMatch={setSelectedMatch}
        />
        <CommitmentCard
          selectedMatch={selectedMatch}
          onRecordChange={handleRecordChange}
        />
      </div>

      <div className="mt-8">
        <Leaderboard records={records} syncStatus={ledgerStatus} />
      </div>

      <div className="mt-8">
        <VerifierCard />
      </div>

      <section className="mt-8 grid gap-4 text-sm sm:grid-cols-3">
        {[
          ["01", "Ingest", "TxLINE remains the primary match-data source."],
          [
            "02",
            "Commit",
            "A canonical prediction hash is posted as a devnet memo.",
          ],
          [
            "03",
            "Reveal",
            "The same payload can be checked after the final whistle.",
          ],
        ].map(([number, title, copy]) => (
          <div
            key={number}
            className="rounded-2xl border border-border-low bg-card p-5"
          >
            <p className="font-mono text-xs text-green-400">{number}</p>
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="mt-1 leading-relaxed text-muted">{copy}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
