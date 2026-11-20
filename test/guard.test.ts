import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { IdempotencyStore, guardWebhook, verifySignature } from "../src/webhooks/guard.js";

const secret = "whsec_test";
const body = JSON.stringify({ id: "evt_1", type: "payment.succeeded" });
const t = 1_700_000_000;
const now = () => t * 1000;
const sign = (ts: number, b: string, s = secret) =>
  `t=${ts},v1=${createHmac("sha256", s).update(`${ts}.${b}`).digest("hex")}`;

describe("verifySignature", () => {
  it("accepts a valid signature", () => {
    expect(verifySignature(sign(t, body), body, { secret, now })).toEqual({ ok: true });
  });

  it("rejects a wrong secret", () => {
    expect(verifySignature(sign(t, body, "other"), body, { secret, now })).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects a tampered body", () => {
    expect(verifySignature(sign(t, body), body + " ", { secret, now })).toMatchObject({
      reason: "bad_signature",
    });
  });

  it("rejects a stale timestamp", () => {
    expect(verifySignature(sign(t - 301, body), body, { secret, now })).toMatchObject({
      reason: "stale",
    });
  });

  it("rejects a missing or malformed header", () => {
    expect(verifySignature(undefined, body, { secret, now })).toMatchObject({ reason: "malformed" });
    expect(verifySignature("t=abc,v1=zz", body, { secret, now })).toMatchObject({
      reason: "malformed",
    });
  });
});

describe("IdempotencyStore", () => {
  it("claims an id once and expires it after the TTL", () => {
    let clock = 0;
    const store = new IdempotencyStore(1000, () => clock);
    expect(store.claim("evt_1")).toBe(true);
    expect(store.claim("evt_1")).toBe(false);
    clock = 1001;
    expect(store.claim("evt_1")).toBe(true);
  });
});

describe("guardWebhook", () => {
  it("processes a retried delivery only once", () => {
    const store = new IdempotencyStore(60_000, now);
    const input = { signatureHeader: sign(t, body), body, eventId: "evt_1" };
    expect(guardWebhook(input, store, { secret, now })).toEqual({ ok: true });
    expect(guardWebhook(input, store, { secret, now })).toEqual({ ok: false, reason: "duplicate" });
  });
});
