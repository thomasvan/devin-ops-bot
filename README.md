# devin-ops-bot

Work in progress by [CoffeeMug VN](https://coffeemugvn.com/).

A Devin Bot setup that takes routine engineering ops off our team:

1. **Sentry triage and fixes.** Watch Sentry for new high-impact errors
   (failed payment webhooks, DB timeouts, unhandled promise rejections).
   Reproduce each one, open a PR with a fix and a regression test, and ping
   an engineer to review.
2. **Morning dashboard report.** Log into our admin dashboards each morning,
   pull the key numbers, and post a short summary in Slack.
3. **Weekly summary.** Post what the bot did each week: PRs opened, merged,
   errors closed.

## Status

Early scaffold. Nothing here runs in production yet. We will publish real
results after the first month.

## Layout

```
src/
  sentry/triage.ts      # pick which new Sentry issues the bot should take
  sentry/webhook-repro.ts # replay a failed payment webhook locally
  reports/morning.ts    # build the morning Slack summary
config/
  example.env           # required settings (no secrets committed)
```

## Failure handling

If a dashboard login or 2FA step fails, the bot stops, posts the failed step
in Slack, and asks a teammate for a fresh code or session. It never guesses
and never skips the report.

## License

MIT
