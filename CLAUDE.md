# ProofLeague

ProofLeague is a public Next.js + TypeScript Solana dApp for the TxODDS World Cup Hackathon.

## Product proof

- TxLINE is the primary match-data input.
- MVP scope is one home/draw/away market and one autonomous agent.
- A prediction payload is canonicalized and SHA-256 hashed before kickoff.
- The connected browser wallet posts `proofleague:v1:<hash>` as an SPL Memo on Solana devnet.
- Only scheduled fixtures before kickoff may be committed.
- The payload, hash, transaction signature, verification result, final result, and score should remain public.
- Use virtual credits only. Do not add custody, withdrawals, real-money betting, or financial promises.

## Stack decisions

- Official Solana Foundation `solana-foundation/templates/kit/nextjs` starter.
- Next.js App Router, TypeScript, Tailwind CSS, `@solana/kit` v7, and Wallet Standard discovery.
- `app/api/txline/matches/route.ts` is the server-side adapter boundary.
- `app/lib/proof.ts` owns canonical prediction JSON and SHA-256 hashing.
- Devnet memo commitment is the first on-chain proof; no custom Anchor program is part of this scaffold.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

Copy `.env.example` to `.env.local` and set the server-only TxLINE values before testing the live feed. Never commit `.env.local` or API keys.

## Engineering rules

- Keep secrets server-side and out of client bundles.
- Preserve deterministic canonicalization when changing prediction fields.
- Default to Solana devnet for demo commitments and verify signatures through Explorer.
- Keep the integration boundary small; do not add an on-chain program until the public demo needs one.
