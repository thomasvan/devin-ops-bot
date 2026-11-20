import { describe, expect, it, vi } from "vitest";
import { listUnresolved, toIssue } from "../src/sentry/client.js";
import { postToSlack } from "../src/slack/post.js";
import { formatSummary } from "../src/reports/morning.js";

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });

describe("sentry client", () => {
  it("maps raw API issues and sends the auth header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ok([
        {
          id: "42",
          title: "DB timeout",
          culprit: "orders.ts",
          count: "17",
          userCount: 5,
          tags: [{ key: "env", value: "prod" }],
        },
      ]),
    );
    const issues = await listUnresolved(
      { token: "t", org: "o", project: "p" },
      fetchMock as unknown as typeof fetch,
    );
    expect(issues[0]).toEqual({
      id: "42",
      title: "DB timeout",
      culprit: "orders.ts",
      count: 17,
      userCount: 5,
      tags: { env: "prod" },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/projects/o/p/issues/");
    expect(init.headers.Authorization).toBe("Bearer t");
  });

  it("throws on a non-200 response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("nope", { status: 401 }));
    await expect(
      listUnresolved(
        { token: "bad", org: "o", project: "p" },
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toThrow("Sentry API 401");
  });

  it("handles issues with no tags", () => {
    const i = toIssue({
      id: "1",
      title: "x",
      culprit: "y",
      count: "3",
      userCount: 0,
    });
    expect(i.tags).toEqual({});
  });
});

describe("slack", () => {
  it("posts JSON text to the webhook", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    await postToSlack(
      "https://hooks.example/x",
      "hello",
      fetchMock as unknown as typeof fetch,
    );
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ text: "hello" });
  });
});

describe("morning report", () => {
  it("shows the change from the previous value", () => {
    const text = formatSummary("2026-11-20", [
      { name: "Signups", value: 120, previous: 100 },
      { name: "Refunds", value: 3, previous: 5 },
      { name: "MRR", value: 5000 },
    ]);
    expect(text).toContain("Signups: 120 (+20)");
    expect(text).toContain("Refunds: 3 (-2)");
    expect(text).toContain("MRR: 5000");
  });
});
