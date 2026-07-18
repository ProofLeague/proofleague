import { NextResponse } from "next/server";
import { getRuntimeTxlineCredentials } from "../../../../lib/txline-activation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const host = request.headers.get("host")?.split(":")[0];
  if (
    process.env.NODE_ENV !== "development" ||
    (host !== "localhost" && host !== "127.0.0.1")
  ) {
    return NextResponse.json({ error: "Local-only route." }, { status: 404 });
  }

  const credentials = getRuntimeTxlineCredentials();
  if (!credentials) {
    return NextResponse.json(
      { error: "TxLINE has not been activated in this local server." },
      { status: 404 }
    );
  }

  return NextResponse.json(credentials, {
    headers: { "Cache-Control": "no-store" },
  });
}
