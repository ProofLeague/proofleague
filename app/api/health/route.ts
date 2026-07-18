import { NextResponse } from "next/server";
import { getRuntimeTxlineCredentials } from "../../lib/txline-activation";

export const dynamic = "force-dynamic";

export function GET() {
  const runtimeCredentials = getRuntimeTxlineCredentials();
  const apiConfigured = Boolean(
    process.env.TXLINE_API_URL?.trim() || runtimeCredentials
  );
  const sessionJwtConfigured = Boolean(
    process.env.TXLINE_SESSION_JWT?.trim() || runtimeCredentials?.sessionJwt
  );
  const apiTokenConfigured = Boolean(
    process.env.TXLINE_API_TOKEN?.trim() || runtimeCredentials?.apiToken
  );
  const scoresConfigured = Boolean(
    process.env.TXLINE_SCORES_URL_TEMPLATE?.trim() || runtimeCredentials
  );

  return NextResponse.json({
    ok: true,
    service: "proofleague",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    cluster: "devnet",
    txline: {
      readyForFixtures:
        apiConfigured && sessionJwtConfigured && apiTokenConfigured,
      scoresConfigured,
      runtimeActivated: Boolean(runtimeCredentials),
    },
    ledger: "process-memory",
    timestamp: new Date().toISOString(),
  });
}
