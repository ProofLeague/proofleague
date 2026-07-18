import { NextResponse } from "next/server";
import { getTxlineConfigStatus } from "../../../lib/txline";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getTxlineConfigStatus();

  return NextResponse.json({
    freeTier: true,
    ...status,
    readyForFixtures:
      status.apiConfigured &&
      status.sessionJwtConfigured &&
      status.apiTokenConfigured,
  });
}
