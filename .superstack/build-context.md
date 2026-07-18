# ProofLeague build context

## stack

- `starter`: `solana-foundation/templates/kit/nextjs` via `create-solana-dapp@4.8.5`
- `framework`: Next.js App Router + TypeScript + Tailwind CSS
- `solana`: `@solana/kit` v7, `@solana/react`, Wallet Standard discovery, SPL Memo plugin
- `server_adapter`: Next.js route handler at `/api/txline/matches`
- `testing`: starter lint/format/build checks; focused unit and browser tests remain to be added during MVP implementation
- `additional_skills`: `frontend-framework-kit`, `solana-kit-skill` are the relevant follow-on implementation skills
- `additional_mcps`: `helius-mcp` and `phantom-mcp-server` are optional follow-on integrations; no external MCP configuration or credentials are required for this scaffold

## architecture

### Next.js public dApp with server adapter and client-signed devnet memo

- The public UI reads normalized fixtures through a server-side TxLINE adapter so API credentials never reach the browser.
- Prediction payloads are canonicalized and SHA-256 hashed in `app/lib/proof.ts`.
- The connected wallet signs a Memo transaction on devnet containing the hash; this is the first verifiable commitment primitive.
- No Anchor program, prediction market, custody, withdrawals, or real-money flow is included.
- `TXLINE_API_URL`, `TXLINE_API_KEY`, and `TXLINE_REQUEST_TIMEOUT_MS` are documented in `.env.example` only.

## build_status

```yaml
mvp_complete: false
tests_passing: false
devnet_deployed: false
```

## next implementation slice

1. Confirm the real TxLINE response shape and update the normalizer with fixtures.
2. Persist committed payloads and signatures in a small server-side store.
3. Add reveal, result scoring, leaderboard, and signature/hash verification views.
4. Add Vitest/Playwright coverage and publish the public deployment.
