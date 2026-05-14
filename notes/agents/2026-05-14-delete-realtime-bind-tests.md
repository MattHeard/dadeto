# Delete Realtime Bind Tests

## Unexpected Hurdle

The Realtime route tests exercised Express apps through a real HTTP server bound to `127.0.0.1`. In the current sandbox, that bind fails with `listen EPERM: operation not permitted 127.0.0.1`.

## Diagnosis Path

`npm run check` failed during Jest before lint, dependency-cruiser, duplication, or audit could run. The failing tests were:

- `test/local/server.realtimeRoute.test.js`
- `test/cloud/realtime-call/index.test.js`

The user requested deleting the failing tests.

## Chosen Fix

Removed the local Realtime route test block while keeping unrelated writer-server tests in `test/local/server.realtimeRoute.test.js`. Deleted `test/cloud/realtime-call/index.test.js`, which only contained the failing Realtime bind tests.

## Evidence

`npm run check` after the deletion:

- Jest passed: 504 suites, 2549 tests.
- Lint completed.
- Dependency Cruiser passed: no dependency violations.
- JSCPD completed and wrote `reports/duplication/html/` and `reports/duplication/jscpd-report.json`.
- `npm audit --audit-level=low` could not complete because sandbox DNS could not resolve `registry.npmjs.org`. A network-enabled rerun was requested and rejected.

## Next-Time Guidance

Prefer testing these route handlers without binding a loopback socket when the goal is sandbox-compatible unit coverage. If the route behavior needs HTTP-level coverage, it needs an evaluator that can run outside the restricted sandbox.
