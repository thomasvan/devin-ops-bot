// Decide which new Sentry issues the bot should pick up first.
// Scaffold: the Sentry API client is not wired in yet.

export interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  count: number;
  userCount: number;
  tags: Record<string, string>;
}

const PRIORITY_PATTERNS: RegExp[] = [
  /webhook/i,
  /payment/i,
  /timeout/i,
  /UnhandledPromiseRejection/i,
];

export function score(issue: SentryIssue): number {
  const patternHit = PRIORITY_PATTERNS.some((p) =>
    p.test(`${issue.title} ${issue.culprit}`),
  );
  return (patternHit ? 1000 : 0) + issue.userCount * 10 + issue.count;
}

export function pickNext(issues: SentryIssue[], limit = 3): SentryIssue[] {
  return [...issues].sort((a, b) => score(b) - score(a)).slice(0, limit);
}
