// Retry transient failures (network errors, 429, 5xx) with exponential
// backoff and full jitter. Used around Sentry and Slack calls so one flaky
// request doesn't drop the morning report.

export interface RetryOptions {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  isRetryable?: (err: unknown) => boolean;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function defaultIsRetryable(err: unknown): boolean {
  if (err instanceof HttpError) return err.status === 429 || err.status >= 500;
  return err instanceof TypeError; // fetch network failures
}

export function backoffDelay(attempt: number, baseMs: number, maxMs: number, random: () => number): number {
  const cap = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.floor(random() * cap);
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const {
    retries = 3,
    baseMs = 200,
    maxMs = 5000,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    random = Math.random,
    isRetryable = defaultIsRetryable,
  } = opts;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) throw err;
      await sleep(backoffDelay(attempt, baseMs, maxMs, random));
    }
  }
}
