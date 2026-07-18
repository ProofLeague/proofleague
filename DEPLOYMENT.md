# ProofLeague deployment runbook

ProofLeague is a Next.js server application. The public demo should run on
Solana devnet and must keep TxLINE credentials server-side.

## Required environment variables

Set these in the hosting provider's server environment, never in a public
repository or `NEXT_PUBLIC_*` variable:

```text
TXLINE_API_URL=https://txline-dev.txodds.com/api/fixtures/snapshot
TXLINE_SESSION_JWT=<activated guest JWT>
TXLINE_API_TOKEN=<activated TxLINE API token>
TXLINE_SCORES_URL_TEMPLATE=https://txline-dev.txodds.com/api/scores/snapshot/{fixtureId}
TXLINE_REQUEST_TIMEOUT_MS=10000
```

`TXLINE_ODDS_URL_TEMPLATE` is optional. The app can run without odds while the
fixture and score endpoints are being validated.

## Build and run

```bash
npm ci
npm run build
npm run start -- -H 0.0.0.0 -p 3001
```

After the process starts, check:

```bash
curl https://<public-host>/api/health
curl https://<public-host>/api/txline/status
```

The health endpoint reports readiness booleans only. It never returns the JWT
or API token. A successful public demo should report `txline.readyForFixtures`
as `true`, then `/api/txline/matches` should return real TxLINE fixtures.

## Activation boundary

The in-app activation helper stores its short-lived session and activated
credentials in server process memory. This is appropriate for a single-process
hackathon demo after the user manually approves the devnet subscription and
activation message. Configure credentials through the host's secret manager
for a multi-instance deployment; do not depend on process-memory activation in
that environment.

## Demo readiness

Before submitting the public URL:

1. Leave the app on `devnet` and confirm `/api/health` is reachable.
2. Verify `/api/txline/matches` returns a real fixture, not the configuration error.
3. Run the private agent once and verify its JSON with `npm run verify:agent -- <file>`.
4. Import the JSON, select a match, review the Memo hash, and approve one devnet transaction manually.
5. Open the Explorer link, capture the final-score reveal, and record the demo.

Never deploy `.env.local`, wallet files, private keys, seed phrases, or session
transcripts into the public repository.
