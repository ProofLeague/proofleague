# ProofLeague

ProofLeague is a public Solana dApp for the TxODDS World Cup Hackathon. It is designed to make an autonomous football prediction auditable: read a match from TxLINE, commit a canonical prediction hash before kickoff, then reveal and score it after the result.

This scaffold intentionally starts with one home/draw/away market, one agent, virtual credits, and a Solana devnet Memo commitment. It does not include custody, withdrawals, real-money betting, or a custom on-chain program.

## What is here

- Official Solana Foundation Next.js + TypeScript starter using `@solana/kit` and Wallet Standard discovery.
- Public match feed at `/api/txline/matches`, backed by a server-side TxLINE adapter.
- Deterministic prediction canonicalization and SHA-256 hashing in `app/lib/proof.ts`.
- Public hash verifier at `/api/proof/verify` plus a browser verification card.
- Connected-wallet devnet commitment that posts `proofleague:v1:<hash>` through the SPL Memo program.
- Shared proof ledger API at `/api/ledger` for the public MVP leaderboard.
- On-demand final-score enrichment at `/api/txline/matches/:matchId/score`.
- Cluster selector, wallet connection, Explorer links, and a clear path to reveal/scoring.

## Run locally

```bash
npm install
cp .env.example .env.local
# Set TXLINE_API_URL, TXLINE_SESSION_JWT, and TXLINE_API_TOKEN in .env.local
# after activating the matching TxLINE devnet free tier.
npm run dev
```

Open http://localhost:3001, leave the cluster on `devnet`, connect a Solana wallet, and use devnet SOL from [faucet.solana.com](https://faucet.solana.com/) if needed. Port 3000 is intentionally avoided because another local app may already use it.

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## TxLINE adapter contract

Set `TXLINE_API_URL` to the server-side endpoint. The official devnet fixture
snapshot is `https://txline-dev.txodds.com/api/fixtures/snapshot`. Configure
`TXLINE_SESSION_JWT` and `TXLINE_API_TOKEN` in the server environment; they are
sent only as `Authorization: Bearer ...` and `X-Api-Token: ...` headers. The
adapter accepts the official `FixtureId`, `StartTime`, `Participant1`, and
`Participant2` fields as well as the redacted local contract. Each match should
provide an ID, home team, away team, and kickoff timestamp; status, 1X2 odds,
and score are optional.
Configure `TXLINE_SCORES_URL_TEMPLATE` for the official score snapshot
endpoint; the UI requests it when a fixture is selected and keeps the fixture
usable if score enrichment is temporarily unavailable.

The API key is read only on the server and is never placed in a `NEXT_PUBLIC_*` variable. `.env.local` is ignored by git.

## Repository boundary

This public repository contains the auditable product surface: the UI, protocol
types, canonical hashing, scoring primitives, and integration boundaries. Agent
strategy composition, operational deployment files, private fixtures, and
credentials stay in the companion private repository under the ProofLeague
organization. No secrets are required to run this public project.

## Commitment format

The committed payload currently contains `agentId`, `matchId`, `modelVersion`, `prediction`, `confidence`, and `generatedAt`. Its sorted-key JSON is hashed with SHA-256. The resulting hash is written to a devnet Memo, while the payload and transaction signature are the inputs for the later reveal and verification flow.

The verifier accepts a `POST` body with `payload` and `expectedHash` and returns
`valid`, `computedHash`, and `expectedHash`. It validates the payload shape and
never calls the upstream TxLINE service.

The ledger API currently uses process memory so the MVP can be demonstrated
across browser tabs against the same running server. Replace it with a durable
database or hosted store before production deployment.

## Next slice

Replace process-memory ledger storage with a durable deployment store, then add
Vitest/Playwright coverage and public deployment.
