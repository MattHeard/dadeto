# Render contents origin and method validator

- Unexpected hurdle: validation combined the stable response writer with the request-time origin decision in a packed config.
- Diagnosis: both preflight and origin/method validation are constructed once per validator, so each can capture the same response writer while keeping current request inputs explicit.
- Fix: added `createOriginAndMethodValidator`, preserving CORS rejection with 403 and method rejection with 405.
- Evidence: focused render-contents Jest passed (4 suites, 74 tests); fresh no-cache scan dropped from 3 to 2 findings; `npm run check` passed all 10 gates; `npm run build:cloud` passed. Logs and scan report are in `.tmp/`.
- Next-time guidance: inspect the remaining `ensureAdminIdentity` finding and preserve its forbidden response and decoded-identity return behavior.
