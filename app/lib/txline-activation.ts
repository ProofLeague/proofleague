const TXLINE_DEVNET_ORIGIN = "https://txline-dev.txodds.com";
const SESSION_TTL_MS = 15 * 60 * 1000;

type ActivationSession = {
  txSig: string;
  jwt: string;
  message: string;
  createdAt: number;
};

type RuntimeCredentials = {
  sessionJwt: string;
  apiToken: string;
};

type ActivationState = {
  sessions: Map<string, ActivationSession>;
  credentials?: RuntimeCredentials;
};

const globalActivation = globalThis as typeof globalThis & {
  __proofLeagueTxlineActivation?: ActivationState;
};

const state: ActivationState =
  globalActivation.__proofLeagueTxlineActivation ??
  (globalActivation.__proofLeagueTxlineActivation = {
    sessions: new Map<string, ActivationSession>(),
  });

function isRecent(createdAt: number) {
  return Date.now() - createdAt < SESSION_TTL_MS;
}

async function readJsonOrText(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text.trim();
  }
}

export function getRuntimeTxlineCredentials() {
  return state.credentials;
}

export async function createTxlineActivationSession(txSig: string) {
  const response = await fetch(`${TXLINE_DEVNET_ORIGIN}/auth/guest/start`, {
    method: "POST",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `TxLINE guest session failed with HTTP ${response.status}.`
    );
  }

  const body = (await readJsonOrText(response)) as
    | {
        token?: unknown;
      }
    | string;
  const jwt = typeof body === "string" ? body : body.token;
  if (typeof jwt !== "string" || !jwt) {
    throw new Error("TxLINE guest session did not return a JWT.");
  }

  const setupId = crypto.randomUUID();
  const message = `${txSig}::${jwt}`;
  state.sessions.set(setupId, {
    txSig,
    jwt,
    message,
    createdAt: Date.now(),
  });
  return { setupId, message };
}

export async function completeTxlineActivation(input: {
  setupId: string;
  txSig: string;
  walletSignature: string;
}) {
  const session = state.sessions.get(input.setupId);
  if (
    !session ||
    !isRecent(session.createdAt) ||
    session.txSig !== input.txSig
  ) {
    state.sessions.delete(input.setupId);
    throw new Error("TxLINE activation session is missing or expired.");
  }

  const response = await fetch(`${TXLINE_DEVNET_ORIGIN}/api/token/activate`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${session.jwt}`,
    },
    body: JSON.stringify({
      txSig: input.txSig,
      walletSignature: input.walletSignature,
      leagues: [],
    }),
  });
  if (!response.ok) {
    throw new Error(`TxLINE activation failed with HTTP ${response.status}.`);
  }

  const body = (await readJsonOrText(response)) as
    | {
        token?: unknown;
      }
    | string;
  const apiToken = typeof body === "string" ? body : body.token;
  if (typeof apiToken !== "string" || !apiToken) {
    throw new Error("TxLINE activation did not return an API token.");
  }

  state.credentials = { sessionJwt: session.jwt, apiToken };
  state.sessions.delete(input.setupId);
  return { activated: true };
}
