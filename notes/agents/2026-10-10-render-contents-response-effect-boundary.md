# Render-contents response effect boundary

- **Unexpected hurdle:** `npm run check` failed in the sandbox with `EPERM` while spawning Node for tests and the core parser, and its audit subprocess did not include detail in the summary.
- **Diagnosis:** The response writes were direct in core. The first full check then identified local simulator adapters as uncovered; their nested placement made direct coverage awkward. The non-core thin gate also required keeping the cloud runtime file below 50 lines.
- **Fix:** Thread one request-scoped `AllowEffects` permission through CORS, request validation, authorization, render execution, and response handling. Inject permission-first response adapters in the cloud runtime and simulator. Move the adapters into small standalone modules and cover the simulator adapter module directly.
- **Evidence:** Six focused suites / 77 tests passed; lint, TSDoc, and cloud packaging passed. Elevated `npm run check` passed all 10 gates, all four coverage metrics at 100%, 11 local E2E journeys, zero clones, and zero npm audit vulnerabilities. Full log: `.tmp/npm-check-render-contents-response-effects-elevated.log`.
- **Next time:** Retry aggregate checks with reviewed elevated access when the sandbox blocks child processes; keep the separate logging-effects slice in `dadeto-c4qz`.
