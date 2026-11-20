// Guards for incoming payment webhooks: signature check, replay window and
// idempotency. Silent webhook failures usually come from one of these three:
// a bad signature that is dropped without a log, a stale retry, or a duplicate
// delivery that double-processes an order.

import { createHmac, timingSafeEqual } from "node:crypto";

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: "bad_signature" | "stale" | "duplicate" | "malformed" };

export interface GuardOptions {
  secret: string;
  toleranceSeconds?: number;
  now?: () => number;
}

// Header format: "t=<unix seconds>,v1=<hex hmac-sha256 of `${t}.${body}`>"
export function verifySignature(
  header: string | undefined,
  body: string,
  opts: GuardOptions,
): GuardResult {
  if (!header) return { ok: false, reason: "malformed" };
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  const sig = parts.v1;
  if (!Number.isFinite(t) || !sig || !/^[0-9a-f]+$/i.test(sig)) {
    return { ok: false, reason: "malformed" };
  }

  const now = (opts.now ?? Date.now)() / 1000;
  const tolerance = opts.toleranceSeconds ?? 300;
  if (Math.abs(now - t) > tolerance) return { ok: false, reason: "stale" };

  const expected = createHmac("sha256", opts.secret).update(`${t}.${body}`).digest();
  const given = Buffer.from(sig, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true };
}

// Remembers event ids for a TTL so retried deliveries are processed once.
export class IdempotencyStore {
  private seen = new Map<string, number>();

  constructor(
    private ttlMs = 24 * 60 * 60 * 1000,
    private now: () => number = Date.now,
  ) {}

  // Returns true the first time an id is seen, false for duplicates.
  claim(eventId: string): boolean {
    this.evict();
    if (this.seen.has(eventId)) return false;
    this.seen.set(eventId, this.now() + this.ttlMs);
    return true;
  }

  get size(): number {
    this.evict();
    return this.seen.size;
  }

  private evict(): void {
    const t = this.now();
    for (const [id, exp] of this.seen) if (exp <= t) this.seen.delete(id);
  }
}

export function guardWebhook(
  input: { signatureHeader?: string; body: string; eventId?: string },
  store: IdempotencyStore,
  opts: GuardOptions,
): GuardResult {
  const sig = verifySignature(input.signatureHeader, input.body, opts);
  if (!sig.ok) return sig;
  if (!input.eventId) return { ok: false, reason: "malformed" };
  if (!store.claim(input.eventId)) return { ok: false, reason: "duplicate" };
  return { ok: true };
}
