# AllowEffects for injected side effects

- Unexpected hurdle: the aggregate check exposed untested failure and fallback paths in the newly permission-bound effects, plus stale source assertions and a thin-module limit.
- Diagnosis: focused tests identified missing effect dependencies in fixtures, a stale browser module expectation, and one uncovered `navigator.sendBeacon` fallback branch.
- Fix: added permission-aware fixture adapters and coverage for checkout UUID failure, beacon permission rejection, moderation auth/HTTP failures, and missing sendBeacon; split browser effect adapters into a small helper module and kept the CDN POST isolated in `cdn-invalidation.js`.
- Next time: extend `capability/allow-effects` over focused effect modules; inspect generated `infra/browser` copies and full coverage output before landing.
- Verification: `npm run check` passed (10/10 gates; unit and local E2E included). Coverage artifacts: `reports/coverage/coverage-summary.json` (lines, statements, functions, and branches all 100%); duplication report: 0 clones. Focused regression suites passed during iteration.
