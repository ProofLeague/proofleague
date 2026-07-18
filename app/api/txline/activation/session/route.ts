import { NextResponse } from "next/server";
import { createTxlineActivationSession } from "../../../../lib/txline-activation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { txSig?: unknown };
    if (
      typeof body.txSig !== "string" ||
      body.txSig.length < 32 ||
      body.txSig.length > 100
    ) {
      return NextResponse.json(
        {
          error: "Enter the Solana devnet subscription transaction signature.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      await createTxlineActivationSession(body.txSig.trim())
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not start activation.",
      },
      { status: 502 }
    );
  }
}
