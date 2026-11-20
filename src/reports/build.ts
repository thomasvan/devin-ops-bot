// Assemble the full morning Slack report: dashboard metrics, the Sentry
// issues Devin will pick up today, and overnight webhook rejections.

import { formatSummary, type Metric } from "./morning.js";
import { pickNext, type SentryIssue } from "../sentry/triage.js";
import type { RejectionTracker } from "../webhooks/alert.js";

export interface MorningInput {
  date: string;
  metrics: Metric[];
  issues: SentryIssue[];
  rejections?: { provider: string; tracker: RejectionTracker };
  limit?: number;
}

export function buildMorningReport(input: MorningInput): string {
  const sections = [formatSummary(input.date, input.metrics)];

  const next = pickNext(input.issues, input.limit ?? 3);
  if (next.length) {
    sections.push(
      ["*Devin picks up today*", ...next.map((i) => `• ${i.title} (${i.count} events, ${i.userCount} users)`)].join(
        "\n",
      ),
    );
  } else {
    sections.push("*Devin picks up today*\n• No new priority issues");
  }

  const r = input.rejections?.tracker.summary(input.rejections.provider);
  if (r) sections.push(`*Webhooks overnight*\n${r}`);

  return sections.join("\n\n");
}
