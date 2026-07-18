import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiConfigured = Boolean(process.env.TXLINE_API_URL?.trim());
  const sessionJwtConfigured = Boolean(process.env.TXLINE_SESSION_JWT?.trim());
  const apiTokenConfigured = Boolean(process.env.TXLINE_API_TOKEN?.trim());
  const scoresConfigured = Boolean(
    process.env.TXLINE_SCORES_URL_TEMPLATE?.trim()
  );

  return NextResponse.json({
    freeTier: true,
    apiConfigured,
    sessionJwtConfigured,
    apiTokenConfigured,
    scoresConfigured,
    readyForFixtures:
      apiConfigured && sessionJwtConfigured && apiTokenConfigured,
  });
}
