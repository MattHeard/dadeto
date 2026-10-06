# Chronoflow network clock page integration

- Unexpected hurdle: the clock service and estimator were available, but the game page had no deployed endpoint in runtime config and did not expose sync freshness to players.
- Diagnosis: traced the page presenter boundary and cloud-generated `/config.json`; the deployed Cloud Function URL can be injected there while fetch and monotonic time stay explicit adapters.
- Fix: load the endpoint from uncached config, sample with `performance.now`, show uncertainty and stale/offline practice status, refresh after expiry, and derive tide phase only from the trusted epoch estimate. Added an explicit synchronized tide-window predicate and browser/E2E coverage.
- Next-time guidance: keep the starter level untimed. A distinct gameplay loop must use the tide-window predicate for a level objective and prove stale/offline states cannot grant timed completion.
- Evidence: `TMPDIR=/home/matt/dadeto/reports/tmp npm run check` passed all 10 gates; coverage summary reports 100% lines, statements, functions, and branches. `npm run manuals:check` validated 77 toy manuals; `git diff --check` passed.
