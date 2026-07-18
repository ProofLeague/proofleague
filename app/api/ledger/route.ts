import { NextResponse } from "next/server";
import { listLedgerRecords, upsertLedgerRecord } from "../../lib/ledger";
import {
  hashPrediction,
  type PredictionChoice,
  type PredictionPayload,
} from "../../lib/proof";
import type { CommittedPrediction } from "../../lib/scoring";

const choices: PredictionChoice[] = ["home", "draw", "away"];
const DEVNET_RPC_URL = "https://api.devnet.solana.com";

async function isConfirmedOnDevnet(signature: string): Promise<boolean> {
  const response = await fetch(DEVNET_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getSignatureStatuses",
      params: [[signature], { searchTransactionHistory: true }],
    }),
    cache: "no-store",
  });
  if (!response.ok) return false;

  const body = (await response.json()) as {
    result?: {
      value?: Array<{
        confirmationStatus?: string | null;
        err?: unknown;
      } | null>;
    };
  };
  const status = body.result?.value?.[0];
  return Boolean(
    status &&
    status.err === null &&
    (status.confirmationStatus === "confirmed" ||
      status.confirmationStatus === "finalized")
  );
}

function isPredictionPayload(value: unknown): value is PredictionPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.agentId === "string" &&
    payload.agentId.length > 0 &&
    typeof payload.matchId === "string" &&
    payload.matchId.length > 0 &&
    typeof payload.modelVersion === "string" &&
    payload.modelVersion.length > 0 &&
    typeof payload.generatedAt === "string" &&
    !Number.isNaN(Date.parse(payload.generatedAt)) &&
    typeof payload.confidence === "number" &&
    Number.isFinite(payload.confidence) &&
    payload.confidence >= 0 &&
    payload.confidence <= 1 &&
    typeof payload.prediction === "string" &&
    choices.includes(payload.prediction as PredictionChoice)
  );
}

function isCommittedPrediction(value: unknown): value is CommittedPrediction {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isPredictionPayload(record.payload) &&
    typeof record.hash === "string" &&
    /^[a-f0-9]{64}$/i.test(record.hash) &&
    typeof record.signature === "string" &&
    record.signature.length > 0 &&
    (record.finalScore === undefined ||
      (typeof record.finalScore === "object" &&
        record.finalScore !== null &&
        typeof (record.finalScore as Record<string, unknown>).home ===
          "number" &&
        typeof (record.finalScore as Record<string, unknown>).away ===
          "number")) &&
    (record.scoredAt === undefined ||
      (typeof record.scoredAt === "string" &&
        !Number.isNaN(Date.parse(record.scoredAt))))
  );
}

export async function GET() {
  return NextResponse.json({
    persistence: "process-memory",
    records: listLedgerRecords(),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { record?: unknown };

    if (!isCommittedPrediction(body.record)) {
      return NextResponse.json(
        { error: "Invalid committed prediction record." },
        { status: 400 }
      );
    }

    const computedHash = await hashPrediction(body.record.payload);
    if (computedHash !== body.record.hash.toLowerCase()) {
      return NextResponse.json(
        { error: "Record hash does not match its prediction payload." },
        { status: 400 }
      );
    }

    if (!(await isConfirmedOnDevnet(body.record.signature))) {
      return NextResponse.json(
        {
          error:
            "Solana devnet transaction is not confirmed yet; the record was not added to the ledger.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      persistence: "process-memory",
      record: upsertLedgerRecord(body.record),
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 }
    );
  }
}
