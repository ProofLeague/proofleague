import type { PredictionPayload } from "./proof";

export type AgentDraft = {
  payload: PredictionPayload;
  hash: string;
  reason: string;
};
