// Turns silent webhook rejections into one Slack alert per window, so a burst
// of bad signatures or duplicates shows up in the morning report instead of
// disappearing into logs.

import type { GuardResult } from "./guard.js";
import { postToSlack } from "../slack/post.js";

type Reason = Extract<GuardResult, { ok: false }>["reason"];

export class RejectionTracker {
  private counts = new Map<Reason, number>();

  record(result: GuardResult): void {
    if (result.ok) return;
    this.counts.set(result.reason, (this.counts.get(result.reason) ?? 0) + 1);
  }

  total(): number {
    let n = 0;
    for (const c of this.counts.values()) n += c;
    return n;
  }

  // Returns the alert text, or null when nothing was rejected.
  summary(provider: string): string | null {
    if (this.total() === 0) return null;
    const parts = [...this.counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([reason, n]) => `${reason.replace("_", " ")}: ${n}`);
    return `:rotating_light: ${provider} webhooks rejected ${this.total()} deliveries (${parts.join(", ")})`;
  }

  reset(): void {
    this.counts.clear();
  }
}

// Posts the summary if the rejection count reaches the threshold, then resets.
export async function flushAlert(
  tracker: RejectionTracker,
  provider: string,
  webhookUrl: string,
  threshold = 1,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const text = tracker.summary(provider);
  if (!text || tracker.total() < threshold) return false;
  await postToSlack(webhookUrl, text, fetchImpl);
  tracker.reset();
  return true;
}
