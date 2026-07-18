import type { PredictionChoice, PredictionPayload } from "./proof";

export type FinalScore = {
  home: number;
  away: number;
};

export type CommittedPrediction = {
  payload: PredictionPayload;
  hash: string;
  signature: string;
  finalScore?: FinalScore;
  scoredAt?: string;
};

export type ScoredPrediction = CommittedPrediction & {
  finalScore: FinalScore;
  outcome: PredictionChoice;
  correct: boolean;
  points: number;
  brierScore: number;
  scoredAt: string;
};

export type LeaderboardEntry = {
  agentId: string;
  predictions: number;
  scored: number;
  correct: number;
  accuracy: number;
  points: number;
  averageConfidence: number;
};

export function outcomeFromScore(score: FinalScore): PredictionChoice {
  if (score.home === score.away) return "draw";
  return score.home > score.away ? "home" : "away";
}

function outcomeVector(
  outcome: PredictionChoice
): Record<PredictionChoice, number> {
  return {
    home: outcome === "home" ? 1 : 0,
    draw: outcome === "draw" ? 1 : 0,
    away: outcome === "away" ? 1 : 0,
  };
}

function predictionVector(
  prediction: PredictionChoice,
  confidence: number
): Record<PredictionChoice, number> {
  const remainder = (1 - confidence) / 2;
  return {
    home: prediction === "home" ? confidence : remainder,
    draw: prediction === "draw" ? confidence : remainder,
    away: prediction === "away" ? confidence : remainder,
  };
}

export function scoreCommittedPrediction(
  record: CommittedPrediction,
  finalScore: FinalScore
): ScoredPrediction {
  const outcome = outcomeFromScore(finalScore);
  const correct = record.payload.prediction === outcome;
  const confidence = Math.min(1, Math.max(0, record.payload.confidence));
  const points = correct ? Math.round(100 * (0.5 + confidence / 2)) : 0;
  const predictionProbabilities = predictionVector(
    record.payload.prediction,
    confidence
  );
  const actualOutcome = outcomeVector(outcome);
  const brierScore = Object.keys(predictionProbabilities).reduce(
    (total, key) =>
      total +
      (predictionProbabilities[key as PredictionChoice] -
        actualOutcome[key as PredictionChoice]) **
        2,
    0
  );

  return {
    ...record,
    finalScore,
    outcome,
    correct,
    points,
    brierScore,
    scoredAt: new Date().toISOString(),
  };
}

export function buildLeaderboard(
  records: CommittedPrediction[]
): LeaderboardEntry[] {
  const grouped = new Map<
    string,
    { entry: LeaderboardEntry; confidenceTotal: number }
  >();

  for (const record of records) {
    const current = grouped.get(record.payload.agentId) ?? {
      entry: {
        agentId: record.payload.agentId,
        predictions: 0,
        scored: 0,
        correct: 0,
        accuracy: 0,
        points: 0,
        averageConfidence: 0,
      },
      confidenceTotal: 0,
    };

    current.entry.predictions += 1;
    current.confidenceTotal += record.payload.confidence;

    if (record.finalScore && record.scoredAt) {
      const scored = scoreCommittedPrediction(record, record.finalScore);
      current.entry.scored += 1;
      current.entry.correct += scored.correct ? 1 : 0;
      current.entry.points += scored.points;
    }

    current.entry.accuracy = current.entry.scored
      ? current.entry.correct / current.entry.scored
      : 0;
    current.entry.averageConfidence =
      current.confidenceTotal / current.entry.predictions;
    grouped.set(record.payload.agentId, current);
  }

  return [...grouped.values()]
    .map(({ entry }) => entry)
    .sort(
      (left, right) =>
        right.points - left.points || right.accuracy - left.accuracy
    );
}
