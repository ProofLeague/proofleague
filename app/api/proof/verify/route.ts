import { NextResponse } from "next/server";
import {
  hashPrediction,
  type PredictionChoice,
  type PredictionPayload,
} from "../../../lib/proof";

const choices: PredictionChoice[] = ["home", "draw", "away"];

function isPredictionPayload(value: unknown): value is PredictionPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.agentId === "string" &&
    typeof payload.matchId === "string" &&
    typeof payload.modelVersion === "string" &&
    typeof payload.generatedAt === "string" &&
    typeof payload.confidence === "number" &&
    Number.isFinite(payload.confidence) &&
    payload.confidence >= 0 &&
    payload.confidence <= 1 &&
    typeof payload.prediction === "string" &&
    choices.includes(payload.prediction as PredictionChoice)
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      payload?: unknown;
      expectedHash?: unknown;
    };

    if (
      !isPredictionPayload(body.payload) ||
      typeof body.expectedHash !== "string" ||
      !/^[a-f0-9]{64}$/i.test(body.expectedHash)
    ) {
      return NextResponse.json(
        { error: "Invalid prediction payload or SHA-256 hash." },
        { status: 400 }
      );
    }

    const computedHash = await hashPrediction(body.payload);
    return NextResponse.json({
      computedHash,
      expectedHash: body.expectedHash.toLowerCase(),
      valid: computedHash === body.expectedHash.toLowerCase(),
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 }
    );
  }
}
