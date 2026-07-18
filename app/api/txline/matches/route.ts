import { NextResponse } from "next/server";
import {
  createTxlineAdapter,
  TxlineConfigurationError,
} from "../../../lib/txline";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const matches = await createTxlineAdapter().listMatches();
    return NextResponse.json({ source: "txline", configured: true, matches });
  } catch (error) {
    if (error instanceof TxlineConfigurationError) {
      return NextResponse.json(
        {
          source: "txline",
          configured: false,
          matches: [],
          error: error.message,
        },
        { status: 503 }
      );
    }

    console.error("TxLINE adapter request failed", error);
    return NextResponse.json(
      {
        source: "txline",
        configured: true,
        matches: [],
        error: "TxLINE is temporarily unavailable",
      },
      { status: 502 }
    );
  }
}
