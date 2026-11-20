// Replay a failed payment webhook against a local server so the bot can
// reproduce the error before writing a fix. Scaffold only.

export interface WebhookEvent {
  provider: string;
  headers: Record<string, string>;
  body: string;
}

export async function replay(
  event: WebhookEvent,
  targetUrl = "http://localhost:3000/api/webhooks/payments",
): Promise<{ status: number; body: string }> {
  const res = await fetch(targetUrl, {
    method: "POST",
    headers: event.headers,
    body: event.body,
  });
  return { status: res.status, body: await res.text() };
}
