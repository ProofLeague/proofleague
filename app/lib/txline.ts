import type { PredictionChoice } from "./proof";
import { getRuntimeTxlineCredentials } from "./txline-activation";

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

export const TXLINE_DEVNET_FIXTURES_URL =
  "https://txline-dev.txodds.com/api/fixtures/snapshot";
export const TXLINE_DEVNET_SCORES_URL_TEMPLATE =
  "https://txline-dev.txodds.com/api/scores/snapshot/{fixtureId}";
export const TXLINE_DEVNET_ODDS_URL_TEMPLATE =
  "https://txline-dev.txodds.com/api/odds/snapshot/{fixtureId}";

type RecordValue = Record<string, unknown>;

export class TxlineConfigurationError extends Error {
  constructor() {
    super("TxLINE credentials or TXLINE_API_URL are not configured");
    this.name = "TxlineConfigurationError";
  }
}

export class TxlineScoresConfigurationError extends Error {
  constructor() {
    super(
      "TxLINE credentials or TXLINE_SCORES_URL_TEMPLATE are not configured"
    );
    this.name = "TxlineScoresConfigurationError";
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

function firstBoolean(
  record: RecordValue,
  keys: string[]
): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
}

function firstIdentifier(
  record: RecordValue,
  keys: string[]
): string | undefined {
  const stringValue = firstString(record, keys);
  if (stringValue) return stringValue;
  const numberValue = firstNumber(record, keys);
  return numberValue === undefined ? undefined : String(numberValue);
}

function firstTimestamp(
  record: RecordValue,
  keys: string[]
): string | undefined {
  const stringValue = firstString(record, keys);
  if (stringValue) return stringValue;

  const numberValue = firstNumber(record, keys);
  if (numberValue === undefined) return undefined;

  const milliseconds =
    numberValue < 10_000_000_000 ? numberValue * 1000 : numberValue;
  const timestamp = new Date(milliseconds);
  return Number.isNaN(timestamp.getTime())
    ? undefined
    : timestamp.toISOString();
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

function choiceFromPriceName(value: string): PredictionChoice | undefined {
  const normalized = value.trim().toLowerCase();
  if (["draw", "tie", "x"].includes(normalized)) return "draw";
  if (["home", "home win", "1"].includes(normalized)) return "home";
  if (["away", "away win", "2"].includes(normalized)) return "away";
  return undefined;
}

function extractOddsSnapshot(
  payload: unknown
): Partial<Record<PredictionChoice, number>> | undefined {
  const records = Array.isArray(payload)
    ? payload
        .map(asRecord)
        .filter((value): value is RecordValue => value !== null)
    : [];
  const odds: Partial<Record<PredictionChoice, number>> = {};

  for (const record of records) {
    const names = Array.isArray(record.PriceNames)
      ? record.PriceNames.filter(
          (value): value is string => typeof value === "string"
        )
      : [];
    const prices = Array.isArray(record.Prices)
      ? record.Prices.map((value) =>
          typeof value === "number" ? value : Number(value)
        )
      : [];

    names.forEach((name, index) => {
      const price = prices[index];
      if (!Number.isFinite(price) || price <= 1) return;
      const choice = choiceFromPriceName(name);
      if (choice && odds[choice] === undefined) odds[choice] = price;
    });
  }

  return Object.keys(odds).length > 0 ? odds : undefined;
}

function normalizeMatch(value: unknown): TxlineMatch | null {
  const record = asRecord(value);
  if (!record) return null;

  const home = asRecord(record.homeTeam) ?? asRecord(record.home);
  const away = asRecord(record.awayTeam) ?? asRecord(record.away);
  const participant1 = firstString(record, ["Participant1", "participant1"]);
  const participant2 = firstString(record, ["Participant2", "participant2"]);
  const participant1IsHome = firstBoolean(record, [
    "Participant1IsHome",
    "participant1IsHome",
  ]);
  const normalizedParticipantHome =
    participant1IsHome === false ? participant2 : participant1;
  const normalizedParticipantAway =
    participant1IsHome === false ? participant1 : participant2;
  const homeTeam =
    firstString(record, ["homeTeam", "home", "home_name"]) ??
    firstString(home ?? {}, ["name", "team"]) ??
    normalizedParticipantHome;
  const awayTeam =
    firstString(record, ["awayTeam", "away", "away_name"]) ??
    firstString(away ?? {}, ["name", "team"]) ??
    normalizedParticipantAway;
  const id = firstIdentifier(record, [
    "id",
    "matchId",
    "eventId",
    "fixtureId",
    "FixtureId",
  ]);
  const kickoffAt = firstTimestamp(record, [
    "kickoffAt",
    "kickoff",
    "startTime",
    "start_time",
    "scheduledAt",
    "StartTime",
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
    status: normalizeStatus(record.status ?? record.state ?? record.GameState),
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

function extractScoreUpdates(payload: unknown): RecordValue[] {
  if (Array.isArray(payload)) {
    return payload
      .map(asRecord)
      .filter((value): value is RecordValue => value !== null);
  }

  const record = asRecord(payload);
  if (!record) return [];

  for (const key of ["scores", "updates", "data"]) {
    if (Array.isArray(record[key])) {
      return record[key]
        .map(asRecord)
        .filter((value): value is RecordValue => value !== null);
    }
  }

  return [record];
}

function scoreFromParticipant(value: unknown): number | undefined {
  const participant = asRecord(value);
  if (!participant) return undefined;
  const total = asRecord(participant.Total) ?? asRecord(participant.total);
  return firstNumber(total ?? participant, [
    "Goals",
    "goals",
    "Score",
    "score",
  ]);
}

function extractFinalScore(payload: unknown): TxlineMatch["score"] {
  for (const update of extractScoreUpdates(payload)) {
    const action = firstString(update, ["action", "Action"])?.toLowerCase();
    const statusId = firstNumber(update, ["statusId", "StatusId"]);
    const period = firstNumber(update, ["period", "Period"]);
    const isFinal =
      action === "game_finalised" || statusId === 100 || period === 100;
    if (!isFinal) continue;

    const soccer = asRecord(update.scoreSoccer) ?? asRecord(update.ScoreSoccer);
    const generic = asRecord(update.score) ?? asRecord(update.Score);
    const scores = soccer ?? generic;
    if (!scores) continue;

    const participant1 = scoreFromParticipant(
      scores.Participant1 ?? scores.participant1
    );
    const participant2 = scoreFromParticipant(
      scores.Participant2 ?? scores.participant2
    );
    if (participant1 === undefined || participant2 === undefined) continue;

    const participant1IsHome = firstBoolean(update, [
      "participant1IsHome",
      "Participant1IsHome",
    ]);
    return participant1IsHome === false
      ? { home: participant2, away: participant1 }
      : { home: participant1, away: participant2 };
  }

  return undefined;
}

export function normalizeTxlineMatches(payload: unknown): TxlineMatch[] {
  return extractMatches(payload)
    .map(normalizeMatch)
    .filter((match): match is TxlineMatch => match !== null);
}

export function getTxlineConfigStatus() {
  const runtimeCredentials = getRuntimeTxlineCredentials();
  const hasEnvironmentCredentials = Boolean(
    process.env.TXLINE_SESSION_JWT?.trim() &&
    (process.env.TXLINE_API_TOKEN?.trim() || process.env.TXLINE_API_KEY?.trim())
  );
  const hasCredentials = Boolean(
    runtimeCredentials || hasEnvironmentCredentials
  );

  return {
    apiConfigured: Boolean(
      process.env.TXLINE_API_URL?.trim() || hasCredentials
    ),
    sessionJwtConfigured: Boolean(
      process.env.TXLINE_SESSION_JWT?.trim() || runtimeCredentials?.sessionJwt
    ),
    apiTokenConfigured: Boolean(
      process.env.TXLINE_API_TOKEN?.trim() ||
      process.env.TXLINE_API_KEY?.trim() ||
      runtimeCredentials?.apiToken
    ),
    scoresConfigured: Boolean(
      process.env.TXLINE_SCORES_URL_TEMPLATE?.trim() || hasCredentials
    ),
    runtimeActivated: Boolean(runtimeCredentials),
  };
}

export function createTxlineAdapter() {
  const runtimeCredentials = getRuntimeTxlineCredentials();
  const configStatus = getTxlineConfigStatus();
  const endpoint =
    process.env.TXLINE_API_URL?.trim() ??
    (configStatus.apiConfigured ? TXLINE_DEVNET_FIXTURES_URL : undefined);
  const scoresEndpointTemplate =
    process.env.TXLINE_SCORES_URL_TEMPLATE?.trim() ??
    (configStatus.scoresConfigured
      ? TXLINE_DEVNET_SCORES_URL_TEMPLATE
      : undefined);
  const oddsEndpointTemplate =
    process.env.TXLINE_ODDS_URL_TEMPLATE?.trim() ??
    (configStatus.apiConfigured ? TXLINE_DEVNET_ODDS_URL_TEMPLATE : undefined);
  const sessionJwt =
    process.env.TXLINE_SESSION_JWT?.trim() ?? runtimeCredentials?.sessionJwt;
  const apiToken =
    process.env.TXLINE_API_TOKEN?.trim() ??
    process.env.TXLINE_API_KEY?.trim() ??
    runtimeCredentials?.apiToken;
  const legacyApiKey =
    !process.env.TXLINE_API_TOKEN?.trim() && !sessionJwt
      ? process.env.TXLINE_API_KEY?.trim()
      : undefined;

  if (!endpoint) throw new TxlineConfigurationError();

  const headers = {
    accept: "application/json",
    ...(sessionJwt || legacyApiKey
      ? { authorization: `Bearer ${sessionJwt ?? legacyApiKey}` }
      : {}),
    ...(apiToken ? { "x-api-token": apiToken } : {}),
  };

  async function requestJson(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.TXLINE_REQUEST_TIMEOUT_MS ?? 8000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers,
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`TxLINE request failed with HTTP ${response.status}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async listMatches(): Promise<TxlineMatch[]> {
      const matches = normalizeTxlineMatches(await requestJson(endpoint));
      if (!oddsEndpointTemplate) return matches;

      return Promise.all(
        matches.map(async (match) => {
          try {
            const payload = await requestJson(
              oddsEndpointTemplate.replace(
                "{fixtureId}",
                encodeURIComponent(match.id)
              )
            );
            const odds = extractOddsSnapshot(payload);
            return odds ? { ...match, odds } : match;
          } catch {
            return match;
          }
        })
      );
    },
    async getFinalScore(fixtureId: string): Promise<TxlineMatch["score"]> {
      if (!scoresEndpointTemplate) throw new TxlineScoresConfigurationError();
      const scoreEndpoint = scoresEndpointTemplate.replace(
        "{fixtureId}",
        encodeURIComponent(fixtureId)
      );
      return extractFinalScore(await requestJson(scoreEndpoint));
    },
  };
}
