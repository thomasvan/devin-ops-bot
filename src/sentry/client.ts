// Minimal Sentry API client: list unresolved issues for one project.
// Docs: https://docs.sentry.io/api/events/list-a-projects-issues/

import type { SentryIssue } from "./triage.js";

export interface SentryConfig {
  token: string;
  org: string;
  project: string;
  baseUrl?: string;
}

interface RawIssue {
  id: string;
  title: string;
  culprit: string;
  count: string;
  userCount: number;
  tags?: { key: string; value: string }[];
}

export function toIssue(raw: RawIssue): SentryIssue {
  const tags: Record<string, string> = {};
  for (const t of raw.tags ?? []) tags[t.key] = t.value;
  return {
    id: raw.id,
    title: raw.title,
    culprit: raw.culprit,
    count: Number(raw.count),
    userCount: raw.userCount,
    tags,
  };
}

export async function listUnresolved(
  cfg: SentryConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SentryIssue[]> {
  const base = cfg.baseUrl ?? "https://sentry.io";
  const url = `${base}/api/0/projects/${cfg.org}/${cfg.project}/issues/?query=is:unresolved&statsPeriod=24h`;
  const res = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  if (!res.ok) {
    throw new Error(`Sentry API ${res.status}: ${await res.text()}`);
  }
  const raw = (await res.json()) as RawIssue[];
  return raw.map(toIssue);
}
