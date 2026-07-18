export type PredictionChoice = "home" | "draw" | "away";

export type PredictionPayload = {
  agentId: string;
  matchId: string;
  modelVersion: string;
  prediction: PredictionChoice;
  confidence: number;
  generatedAt: string;
};

type JsonObject = { [key: string]: JsonValue };
type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;

function canonicalize(value: JsonValue): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return JSON.stringify(value);
  }

  if (typeof value === "string") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
    .join(",")}}`;
}

export function canonicalPredictionJson(payload: PredictionPayload): string {
  return canonicalize(payload);
}

export async function hashPrediction(
  payload: PredictionPayload
): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalPredictionJson(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}
