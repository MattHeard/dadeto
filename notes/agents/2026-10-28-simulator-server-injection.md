# Simulator server platform injection — 28 October 2026

Owning Bead `dadeto-fyyl`, under Rank 11 / `dadeto-e1oz`.

## Change

`createSimulatorServer` requires pure path joining, port/public directory values
and byte recognition. Native path/module-URL/env/Buffer operations stay in the
34-line local facade, preserving `handle`/`sendRouteResponse` and CLI defaults.
Each core factory has its own lazy simulator cache; successful and rejected
construction are cached as before, with explicit supplied simulators bypassing
construction. Startup constructor and logging ports are permission-first and
receive the same outer invocation permission. Middleware startup binding remains.

The server's blanket Stryker directive is removed. The focused mutation harness
selects the whole module with 100% thresholds and static evaluation enabled.
No replacement source exclusion/directive or timeout increase was added. Type-only
Node HTTP/Express references and pre-existing trusted value assertions remain;
this loop does not claim the whole architecture migration is finished.

## Local evidence

- Initial factory regression fails for the missing export:
  `/tmp/dadeto-fyyl-red.log`. Initial native/factory tests pass but one unit suite
  initially imported the wrong test permission mint; corrected to the existing
  cloud mint. Then three suites / ten tests pass; checkJs passes.
- Final three focused suites / **17 tests PASS**, including native HTTP and CLI
  behavior, portable cache/path/token/failure/isolation, every exact route/method
  and body contract, config/seed/health/form, CORS mixed cases, redirects, status/
  body response channels and fallback ports. `/tmp/dadeto-fyyl-focused-final-contracts.log`.
- `TMPDIR=/home/matt/.cache/dadeto-task-tmp/simulator-server npm run
  check:impact:run -- --files src/core/local/gcp-simulator/server.js`: PASS
  (16 tests before the final additional response-channel case), no uncovered
  source lines or branches; lint/parse/zero clones pass.
  `/tmp/dadeto-fyyl-impact-final.log`.
- `npm run check -- --skip-tests`: all **11 gates PASS**, including final
  startup-token/platform compiler contracts. `/tmp/dadeto-fyyl-static-final-contracts.log`.
- `npm run build`, `npm run build:cloud`, `npm run verify:cloud-packages`: PASS;
  27 packages / 713 modules / 1,234 imports.
  `/tmp/dadeto-fyyl-{build,cloud-build,closure}.log`.

These are local/scoped results, not full global coverage. Exact pushed Full Check
is still required before closure. No local Playwright, production/provider
request or deployment was run.

## Mutation baseline and harness correction

First complete newly unsuppressed module mutation fails at 42.25%: **148 total,
56 Killed, 82 Survived, six RuntimeErrors and four Timeouts**, no static mutants
generated. Retain `reports/mutation/simulator-server.initial.json` and
`/tmp/dadeto-fyyl-mutation.log`. Do not describe that as acceptance.

The old listener test created an unhandled derived `starting.then` promise.
When a mutation broke route construction, rejection escaped the test and crashed
workers. Handle that derived rejection while still awaiting the original startup
promise, preserving the test's failure signal. A coherent fixture binder keeps
the unit test within the unchanged statement limit; the logger receives an
explicit returns annotation. No lint suppression.

An attempted stop aborted its process-identity assertion before sending a signal:
Stryker rewrites its argv title. The original process was left running and
finished normally with the failed report above. The corrected receipt in Beads
records that no signal was sent; never claim a process stopped from intent alone.

Exact independent route/header/body/redirect/form/response assertions address
observed survivors. The full final-source 148-mutant rerun is in progress in
`/tmp/dadeto-fyyl-mutation-final.log`. It must reach its terminal gate with an
exact-source report before claiming mutation success.

Use task scratch outside the checkout on normal storage, as shown above. Retain
reports and do not delete shared caches. Existing generated Cloud Function Haste
manifest warnings remain tracked separately in `dadeto-5wxt`.
