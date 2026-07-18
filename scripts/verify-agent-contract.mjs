import { readFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run verify:agent -- /path/to/agent-output.json");
  process.exit(1);
}

const choiceSet = new Set(["home", "draw", "away"]);

function canonicalize(value) {
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

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function assertPayload(payload, index) {
  if (!payload || typeof payload !== "object") {
    throw new Error(`Prediction ${index + 1}: payload is missing.`);
  }
  const required = [
    "agentId",
    "matchId",
    "modelVersion",
    "prediction",
    "confidence",
    "generatedAt",
  ];
  for (const key of required) {
    if (!(key in payload))
      throw new Error(`Prediction ${index + 1}: ${key} is missing.`);
  }
  if (!choiceSet.has(payload.prediction)) {
    throw new Error(
      `Prediction ${index + 1}: prediction must be home, draw, or away.`
    );
  }
  if (
    typeof payload.confidence !== "number" ||
    payload.confidence < 0 ||
    payload.confidence > 1
  ) {
    throw new Error(
      `Prediction ${index + 1}: confidence must be between 0 and 1.`
    );
  }
}

try {
  const document = JSON.parse(await readFile(file, "utf8"));
  const predictions = Array.isArray(document.predictions)
    ? document.predictions
    : [document];
  if (predictions.length === 0) throw new Error("No predictions found.");

  const verified = [];
  for (const [index, prediction] of predictions.entries()) {
    assertPayload(prediction.payload, index);
    if (
      typeof prediction.hash !== "string" ||
      !/^[a-f0-9]{64}$/i.test(prediction.hash)
    ) {
      throw new Error(
        `Prediction ${index + 1}: hash must be a 64-character SHA-256 hex string.`
      );
    }
    const computedHash = await sha256(canonicalize(prediction.payload));
    if (computedHash !== prediction.hash.toLowerCase()) {
      throw new Error(`Prediction ${index + 1}: hash does not match payload.`);
    }
    verified.push({
      matchId: prediction.payload.matchId,
      prediction: prediction.payload.prediction,
      hash: computedHash,
    });
  }

  console.log(
    JSON.stringify(
      { valid: true, count: verified.length, predictions: verified },
      null,
      2
    )
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Agent contract verification failed."
  );
  process.exit(1);
}
