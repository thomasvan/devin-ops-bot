// Sign a payload the same way the payment provider does, so the bot can
// replay a captured failing webhook locally and have it pass the guard.

import { createHmac } from "node:crypto";

export function signPayload(body: string, secret: string, timestampSec = Math.floor(Date.now() / 1000)): string {
  const sig = createHmac("sha256", secret).update(`${timestampSec}.${body}`).digest("hex");
  return `t=${timestampSec},v1=${sig}`;
}

export function signedHeaders(
  body: string,
  secret: string,
  headerName = "x-signature",
  timestampSec?: number,
): Record<string, string> {
  return { "content-type": "application/json", [headerName]: signPayload(body, secret, timestampSec) };
}
