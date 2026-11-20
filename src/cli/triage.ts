// Pull unresolved Sentry issues, pick the top ones, post them to Slack.
// Usage: npm run triage   (reads SENTRY_* and SLACK_WEBHOOK_URL from env)

import { listUnresolved } from "../sentry/client.js";
import { pickNext, score } from "../sentry/triage.js";
import { postToSlack } from "../slack/post.js";

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var ${name}. See config/example.env.`);
    process.exit(1);
  }
  return v;
}

const issues = await listUnresolved({
  token: need("SENTRY_AUTH_TOKEN"),
  org: need("SENTRY_ORG"),
  project: need("SENTRY_PROJECT"),
});

const top = pickNext(issues);
const lines = top.map(
  (i) => `• [${score(i)}] ${i.title} (${i.userCount} users, ${i.count} events)`,
);
const text = [`*Bot will take these next:*`, ...lines].join("\n");

console.log(text);
if (process.env.SLACK_WEBHOOK_URL) {
  await postToSlack(process.env.SLACK_WEBHOOK_URL, text);
}
