# Clone checkpoint: search boundary and POST dispatch

Owning bead: `dadeto-aaou`. Strict jscpd remains at `minTokens: 14`; no
exclusions, exemptions, ignore pragmas, or threshold changes were introduced.

## Changes and regression contract

- Tic-Tac-Toe's best-move reduction now uses a named score selector and a fresh
  fallback per invocation. Tests preserve first-candidate identity on ties,
  strict greater-than selection, and isolation of empty-list fallback objects.
- The rental-search factory binds a reusable request operation owned by the
  existing `request/index.js` boundary. Request interpretation, CORS, methods,
  schedules, and error responses retain their protocol. The provider regression
  invokes the same handler twice and verifies that changing the live runner ID
  changes the provider request without eagerly calling it during construction.
- Async POST dispatch now delegates to the synchronous request dispatcher.
  Regressions preserve synchronous callback execution and thrown-error identity,
  method-access ordering, and non-string method override behavior.

## Hurdles and next-time guidance

Moving the request operation within `search-http.js` passed focused tests but
failed `core-parse`: parser operations belong in sanctioned boundaries. The
existing request `index.js` is the correct owner; an arbitrary `request/http.js`
would not satisfy the policy. Do not relax the policy or rename parsing behavior
to evade it. Boundary relocation initially produced replacement clones in the
context destructuring and catch tail. Using the private bound context directly
and separating failure serialization removes those matches. Explicit callback
and context types also resolve documentation checks without suppressions.

One new short failure-serialization match remains in the latest report, so this
is partial progress, not completion. Re-read the fresh report before the next
loop; old pair locations and counts are not authoritative.

## Evidence

- `.tmp/best-move-tests.log`: 36 tests pass; exact 100% coverage of Tic-Tac-Toe.
- `.tmp/search-boundary-refined-tests.log`: 72 tests across two suites pass;
  exact 100% lines, statements, functions, and branches for the HTTP guard,
  rental-search factory, and request boundary.
- `.tmp/search-boundary-refined-lint.log`: `npm run lint` exits 0.
- `.tmp/search-boundary-refined-static.log`: `npm run check -- --skip-tests`
  exits 1 solely for duplication, down from 22 to 20 clones. All nine other
  checks pass, including parse ownership and JSDoc typing.
- `.tmp/search-boundary-refined-build.log`: `npm run build` exits 0.
- `.tmp/search-boundary-refined-cloud-build.log`: `npm run build:cloud` exits 0.
- `.tmp/clone-goal-20-full-check.log`:
  `TMPDIR=/home/matt/dadeto/.tmp DADETO_COVERAGE_SHARD_SIZE=40 npm run check`
  terminates with exit 1 solely for duplication (20 clones). All 21 test shards
  pass, and the outer ten-gate summary has exactly one failure. Exact global
  coverage in `reports/coverage/coverage-summary.json`: lines 20338/20338,
  statements 21192/21192, functions 7080/7080, branches 10201/10201.
  The goal and bead remain active until zero clones and a green full check.
