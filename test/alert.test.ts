import { describe, expect, it, vi } from "vitest";
import { RejectionTracker, flushAlert } from "../src/webhooks/alert.js";

describe("RejectionTracker", () => {
  it("ignores accepted deliveries and counts rejections by reason", () => {
    const t = new RejectionTracker();
    t.record({ ok: true });
    t.record({ ok: false, reason: "duplicate" });
    t.record({ ok: false, reason: "duplicate" });
    t.record({ ok: false, reason: "bad_signature" });
    expect(t.total()).toBe(3);
    expect(t.summary("stripe")).toBe(
      ":rotating_light: stripe webhooks rejected 3 deliveries (duplicate: 2, bad signature: 1)",
    );
  });

  it("returns null when nothing was rejected", () => {
    expect(new RejectionTracker().summary("stripe")).toBeNull();
  });
});

describe("flushAlert", () => {
  const okFetch = () => vi.fn(async () => new Response("ok", { status: 200 })) as unknown as typeof fetch;

  it("posts once the threshold is reached and resets", async () => {
    const t = new RejectionTracker();
    t.record({ ok: false, reason: "stale" });
    t.record({ ok: false, reason: "stale" });
    const f = okFetch();
    expect(await flushAlert(t, "stripe", "https://hooks.example/x", 2, f)).toBe(true);
    expect(f).toHaveBeenCalledOnce();
    expect(t.total()).toBe(0);
  });

  it("stays quiet below the threshold", async () => {
    const t = new RejectionTracker();
    t.record({ ok: false, reason: "stale" });
    const f = okFetch();
    expect(await flushAlert(t, "stripe", "https://hooks.example/x", 5, f)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
