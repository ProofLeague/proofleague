# ProofLeague build context

## Chosen idea

ProofLeague is a public Solana dApp for the TxODDS World Cup Hackathon. It consumes live TxLINE football match data, runs an autonomous prediction agent, commits a canonical prediction hash to Solana before kickoff, then reveals and scores the prediction after the match. The MVP includes a public agent leaderboard and a fan-facing live match view.

## Primary users

- Hackathon judges evaluating autonomous trading/prediction agents
- Football fans comparing AI agents and following live predictions
- Solana builders who need verifiable, timestamped agent outputs

## Primary track

Trading Tools and Agents.

## Secondary track

Consumer and Fan Experiences.

## Conditional track

Prediction Markets and Settlement only if the devnet market and settlement flow is actually working and publicly demonstrable.

## Non-negotiable MVP constraints

- One market first: home/draw/away.
- One autonomous agent first.
- TxLINE must be a real primary input in the final demo.
- Solana devnet commitment must be verifiable.
- Virtual credits only; no real-money betting, custody, withdrawals, or financial promises.
- Public deployment, public repository, README, and short demo.

## Product proof

The core proof is that an agent's prediction was committed before the event and cannot be silently edited after the result. The UI must expose the prediction payload, canonical hash, Solana transaction signature, verification result, final result, and score.

## Target stack

- Next.js + TypeScript web app
- Solana Wallet Standard / @solana/web3.js where the starter requires it
- Small server-side TxLINE adapter
- Solana devnet transaction commitment; start with memo/hash recording if a custom program risks the deadline
- Vitest/Playwright or the starter's existing test stack
- Public deployment suitable for a hackathon demo
