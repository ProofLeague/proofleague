import type { PredictionChoice } from "./proof";

export type TxlineMatchStatus = "scheduled" | "live" | "finished";

export type TxlineMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: TxlineMatchStatus;
  odds?: Partial<Record<PredictionChoice, number>>;
  score?: { home: number; away: number };
};

type RecordValue = Record<string, unknown>;

export class TxlineConfigurationError extends Error {
  constructor() {
    super("TXLINE_API_URL is not configured");
    this.name = "TxlineConfigurationError";
  }
}

function asRecord(value: unknown): RecordValue | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

function firstString(record: RecordValue, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function firstNumber(record: RecordValue, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }
  return undefined;
}

function normalizeStatus(value: unknown): TxlineMatchStatus {
  const status = typeof value === "string" ? value.toLowerCase() : "scheduled";
  if (["live", "in_play", "in-play", "playing"].includes(status)) return "live";
  if (["finished", "complete", "completed", "final"].includes(status))
    return "finished";
  return "scheduled";
}

function normalizeOdds(
  value: unknown
): Partial<Record<PredictionChoice, number>> | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const home = firstNumber(record, ["home", "homeWin", "home_win"]);
  const draw = firstNumber(record, ["draw", "tie"]);
  const away = firstNumber(record, ["away", "awayWin", "away_win"]);
  const odds = {
    ...(home !== undefined ? { home } : {}),
    ...(draw !== undefined ? { draw } : {}),
    ...(away !== undefined ? { away } : {}),
  } satisfies Partial<Record<PredictionChoice, number>>;

  return Object.keys(odds).length > 0 ? odds : undefined;
}

function normalizeMatch(value: unknown): TxlineMatch | null {
  const record = asRecord(value);
  if (!record) return null;

  const home = asRecord(record.homeTeam) ?? asRecord(record.home);
  const away = asRecord(record.awayTeam) ?? asRecord(record.away);
  const homeTeam =
    firstString(record, ["homeTeam", "home", "home_name"]) ??
    firstString(home ?? {}, ["name", "team"]);
  const awayTeam =
    firstString(record, ["awayTeam", "away", "away_name"]) ??
    firstString(away ?? {}, ["name", "team"]);
  const id = firstString(record, ["id", "matchId", "eventId", "fixtureId"]);
  const kickoffAt = firstString(record, [
    "kickoffAt",
    "kickoff",
    "startTime",
    "start_time",
    "scheduledAt",
  ]);

  if (!id || !homeTeam || !awayTeam || !kickoffAt) return null;

  const homeScore = firstNumber(record, ["homeScore", "home_score"]);
  const awayScore = firstNumber(record, ["awayScore", "away_score"]);
  const score =
    homeScore !== undefined && awayScore !== undefined
      ? { home: homeScore, away: awayScore }
      : undefined;
  const odds = normalizeOdds(
    record.odds ?? record.marketOdds ?? record.market_odds
  );

  return {
    id,
    homeTeam,
    awayTeam,
    kickoffAt,
    status: normalizeStatus(record.status ?? record.state),
    ...(odds ? { odds } : {}),
    ...(score ? { score } : {}),
  };
}

function extractMatches(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];

  for (const key of ["matches", "fixtures", "events", "data"]) {
    if (Array.isArray(record[key])) return record[key];
  }
  return [];
}

export function normalizeTxlineMatches(payload: unknown): TxlineMatch[] {
  return extractMatches(payload)
    .map(normalizeMatch)
    .filter((match): match is TxlineMatch => match !== null);
}

export function createTxlineAdapter() {
  const endpoint = process.env.TXLINE_API_URL?.trim();
  const apiKey = process.env.TXLINE_API_KEY?.trim();

  if (!endpoint) throw new TxlineConfigurationError();

  return {
    async listMatches(): Promise<TxlineMatch[]> {
      const controller = new AbortController();
      const timeoutMs = Number(process.env.TXLINE_REQUEST_TIMEOUT_MS ?? 8000);
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(endpoint, {
          headers: {
            accept: "application/json",
            ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`TxLINE request failed with HTTP ${response.status}`);
        }

        return normalizeTxlineMatches(await response.json());
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
