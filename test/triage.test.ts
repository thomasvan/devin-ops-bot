import { describe, expect, it } from "vitest";
import { pickNext, score, type SentryIssue } from "../src/sentry/triage.js";

function issue(p: Partial<SentryIssue>): SentryIssue {
  return {
    id: "1",
    title: "Error",
    culprit: "app",
    count: 1,
    userCount: 1,
    tags: {},
    ...p,
  };
}

describe("score", () => {
  it("ranks payment webhook errors above plain errors", () => {
    const webhook = issue({ title: "Stripe webhook signature failed" });
    const plain = issue({ title: "Button misaligned", count: 50 });
    expect(score(webhook)).toBeGreaterThan(score(plain));
  });

  it("weights affected users over raw event count", () => {
    const manyUsers = issue({ userCount: 20, count: 20 });
    const manyEvents = issue({ userCount: 1, count: 150 });
    expect(score(manyUsers)).toBeGreaterThan(score(manyEvents));
  });
});

describe("pickNext", () => {
  it("returns the top issues in order, up to the limit", () => {
    const list = [
      issue({ id: "a", title: "Typo" }),
      issue({ id: "b", title: "DB timeout on /orders" }),
      issue({ id: "c", title: "UnhandledPromiseRejection in worker" }),
      issue({ id: "d", title: "Tooltip flicker" }),
    ];
    const ids = pickNext(list, 2).map((i) => i.id);
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(expect.arrayContaining(["b", "c"]));
  });

  it("does not mutate the input list", () => {
    const list = [issue({ id: "a" }), issue({ id: "b", title: "webhook" })];
    pickNext(list);
    expect(list.map((i) => i.id)).toEqual(["a", "b"]);
  });
});
