import { describe, expect, it } from "vitest";
import { signPayload, signedHeaders } from "../src/webhooks/sign.js";
import { verifySignature } from "../src/webhooks/guard.js";

describe("signPayload", () => {
  it("round-trips through the guard", () => {
    const body = '{"id":"evt_9"}';
    const t = 1_700_000_000;
    const header = signPayload(body, "whsec", t);
    expect(verifySignature(header, body, { secret: "whsec", now: () => t * 1000 })).toEqual({ ok: true });
  });

  it("builds replay headers with the signature", () => {
    const h = signedHeaders("{}", "whsec", "stripe-signature", 1);
    expect(h["content-type"]).toBe("application/json");
    expect(h["stripe-signature"]).toMatch(/^t=1,v1=[0-9a-f]{64}$/);
  });
});
