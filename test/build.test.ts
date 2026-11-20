import { describe, expect, it } from "vitest";
import { buildMorningReport } from "../src/reports/build.js";
import { RejectionTracker } from "../src/webhooks/alert.js";

const issue = (id: string, title: string, count: number) => ({
  id,
  title,
  culprit: "api",
  count,
  userCount: Math.ceil(count / 2),
  tags: {},
});

describe("buildMorningReport", () => {
  it("includes metrics, picked issues and webhook rejections", () => {
    const tracker = new RejectionTracker();
    tracker.record({ ok: false, reason: "duplicate" });
    const text = buildMorningReport({
      date: "2026-11-20",
      metrics: [{ name: "Orders", value: 120, previous: 100 }],
      issues: [issue("1", "Payment webhook timeout", 40), issue("2", "CSS glitch", 2)],
      rejections: { provider: "stripe", tracker },
      limit: 1,
    });
    expect(text).toContain("*Morning report 2026-11-20*");
    expect(text).toContain("• Orders: 120 (+20)");
    expect(text).toContain("Payment webhook timeout (40 events, 20 users)");
    expect(text).not.toContain("CSS glitch");
    expect(text).toContain("stripe webhooks rejected 1 deliveries");
  });

  it("says so when there is nothing to pick up and skips empty webhook section", () => {
    const text = buildMorningReport({ date: "d", metrics: [], issues: [] });
    expect(text).toContain("No new priority issues");
    expect(text).not.toContain("Webhooks overnight");
  });
});
