import { NextResponse } from "next/server";
import { completeTxlineActivation } from "../../../../lib/txline-activation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      setupId?: unknown;
      txSig?: unknown;
      walletSignature?: unknown;
    };
    if (
      typeof body.setupId !== "string" ||
      typeof body.txSig !== "string" ||
      typeof body.walletSignature !== "string" ||
      body.setupId.length < 10 ||
      body.txSig.length < 32 ||
      body.walletSignature.length < 40
    ) {
      return NextResponse.json(
        { error: "Invalid TxLINE activation payload." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      await completeTxlineActivation({
        setupId: body.setupId,
        txSig: body.txSig.trim(),
        walletSignature: body.walletSignature,
      })
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not complete activation.",
      },
      { status: 502 }
    );
  }
}
