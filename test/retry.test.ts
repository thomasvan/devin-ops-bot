import { describe, expect, it, vi } from "vitest";
import { HttpError, backoffDelay, withRetry } from "../src/lib/retry.js";

const noSleep = { sleep: async () => {}, random: () => 1 };

describe("backoffDelay", () => {
  it("doubles per attempt and respects the cap", () => {
    expect(backoffDelay(0, 100, 1000, () => 1)).toBe(100);
    expect(backoffDelay(3, 100, 1000, () => 1)).toBe(800);
    expect(backoffDelay(10, 100, 1000, () => 1)).toBe(1000);
  });
});

describe("withRetry", () => {
  it("retries a 503 and then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new HttpError(503, "busy"))
      .mockResolvedValue("ok");
    await expect(withRetry(fn, noSleep)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 400", async () => {
    const fn = vi.fn().mockRejectedValue(new HttpError(400, "bad"));
    await expect(withRetry(fn, noSleep)).rejects.toThrow("bad");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retry budget", async () => {
    const fn = vi.fn().mockRejectedValue(new HttpError(429, "slow down"));
    await expect(withRetry(fn, { ...noSleep, retries: 2 })).rejects.toThrow("slow down");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("retries network errors", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValue(1);
    await expect(withRetry(fn, noSleep)).resolves.toBe(1);
  });
});
