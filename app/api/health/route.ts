import { NextResponse } from "next/server";
import { getTxlineConfigStatus } from "../../lib/txline";

export const dynamic = "force-dynamic";

export function GET() {
  const status = getTxlineConfigStatus();

  return NextResponse.json({
    ok: true,
    service: "proofleague",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    cluster: "devnet",
    txline: {
      readyForFixtures:
        status.apiConfigured &&
        status.sessionJwtConfigured &&
        status.apiTokenConfigured,
      scoresConfigured: status.scoresConfigured,
      runtimeActivated: status.runtimeActivated,
    },
    ledger: "process-memory",
    timestamp: new Date().toISOString(),
  });
}
