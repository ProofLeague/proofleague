# ProofLeague

ProofLeague is a public Solana dApp for the TxODDS World Cup Hackathon. It is designed to make an autonomous football prediction auditable: read a match from TxLINE, commit a canonical prediction hash before kickoff, then reveal and score it after the result.

This scaffold intentionally starts with one home/draw/away market, one agent, virtual credits, and a Solana devnet Memo commitment. It does not include custody, withdrawals, real-money betting, or a custom on-chain program.

## What is here

- Official Solana Foundation Next.js + TypeScript starter using `@solana/kit` and Wallet Standard discovery.
- Public match feed at `/api/txline/matches`, backed by a server-side TxLINE adapter.
- Deterministic prediction canonicalization and SHA-256 hashing in `app/lib/proof.ts`.
- Connected-wallet devnet commitment that posts `proofleague:v1:<hash>` through the SPL Memo program.
- Cluster selector, wallet connection, Explorer links, and a clear path to reveal/scoring.

## Run locally

```bash
npm install
cp .env.example .env.local
# Set TXLINE_API_URL and, if required, TXLINE_API_KEY in .env.local.
npm run dev
```

Open http://localhost:3000, leave the cluster on `devnet`, connect a Solana wallet, and use devnet SOL from [faucet.solana.com](https://faucet.solana.com/) if needed.

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## TxLINE adapter contract

Set `TXLINE_API_URL` to the server-side endpoint. The adapter accepts a top-level array or a response containing `matches`, `fixtures`, `events`, or `data`. Each match should provide an ID, home team, away team, and kickoff timestamp; status and score are optional. Update `app/lib/txline.ts` once the real TxLINE response fixture is available.

The API key is read only on the server and is never placed in a `NEXT_PUBLIC_*` variable. `.env.local` is ignored by git.

## Commitment format

The committed payload currently contains `agentId`, `matchId`, `modelVersion`, `prediction`, and `generatedAt`. Its sorted-key JSON is hashed with SHA-256. The resulting hash is written to a devnet Memo, while the payload and transaction signature are the inputs for the later reveal and verification flow.

## Next slice

Add a small persistence layer for payloads/signatures, then implement reveal, final-result scoring, leaderboard aggregation, and Vitest/Playwright coverage before public deployment.
