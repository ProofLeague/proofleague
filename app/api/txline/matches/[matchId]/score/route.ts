import { NextResponse } from "next/server";
import {
  createTxlineAdapter,
  TxlineConfigurationError,
  TxlineScoresConfigurationError,
} from "../../../../../lib/txline";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await context.params;

  try {
    const score = await createTxlineAdapter().getFinalScore(matchId);
    return NextResponse.json({
      source: "txline",
      matchId,
      score: score ?? null,
    });
  } catch (error) {
    if (
      error instanceof TxlineConfigurationError ||
      error instanceof TxlineScoresConfigurationError
    ) {
      return NextResponse.json(
        { source: "txline", matchId, score: null, error: error.message },
        { status: 503 }
      );
    }

    console.error("TxLINE score request failed", error);
    return NextResponse.json(
      {
        source: "txline",
        matchId,
        score: null,
        error: "TxLINE score unavailable",
      },
      { status: 502 }
    );
  }
}
