# Playwright runner capabilities — 28 October 2026

Owning Bead `dadeto-aaxq`, child of Rank 11 / `dadeto-e1oz`.

## Change

Core runner now has a required platform factory and explicit invocation permission.
It no longer imports child_process/net/path or reads ambient process defaults/
output. Platform configuration supplies root, executable, environment and paths.
Launching, reservation, stream output, child status queries, event subscription/
removal and termination all require the same AllowEffects token. Child capability
ports expose no raw native EventEmitter methods.

The thin local facade keeps `runLocalPlaywright(options)` and the raw spawn
override at the native boundary, strips that function from core options and
snapshots native host data under its invocation boundary. Native child and loopback
port adapters preserve event names, live metadata, absent streams, raw output
bytes, close-before-return ordering and failures. Both script entrypoints import
the local facade. `docker/playwright/Dockerfile` copies the whole src tree, so
those native modules are included without a new image setting.

The runner blanket Stryker directive is removed, with no replacement skip or
threshold reduction. The focused harness mutates the entire module with static
evaluation enabled. Runtime regex and local accumulation remain ordinary source.

## Evidence

Initial factory regression fails for its missing export:
`/tmp/dadeto-aaxq-red.log`. Initial compiler caught malformed generated JSDoc
record prefixes; those were fixed. Core/native permission signatures and negative
compiler fixtures now pass. Initial focused set passes18 tests, expanded native
child/core set24, and the final workflow/native/core set43.

Mutation-driven explicit overrides, exact cleanup state, protocol variants, late
settlement and precise exit messages then pass **eight focused suites / 56 tests**,
`/tmp/dadeto-aaxq-focused-survivors.log`. Core tests use fake host metadata/paths/
port reservation and token-checking resource methods. Tests can emit raw-style
Buffer chunks through fixtures, but the direct protocol tests need no native
stream object. Native tests use mocked processes; actual Playwright is never run.

`TMPDIR=/home/matt/.cache/dadeto-task-tmp/playwright-runner npm run
check:impact:run -- --files src/core/local/gcp-simulator/playwright-runner.js`:
**four suites / 35 tests PASS**, no uncovered source lines or branches,
lint/parse/zero-clone checks pass; `/tmp/dadeto-aaxq-hardening-impact.log`.

`npm run check -- --skip-tests`: **all 11 gates PASS**, including compiler
contracts that reject omitted permissions for invocation, launch, reservation,
status, stream/event handling, output and cleanup. Raw spawn options are rejected
by the core signature. Log `/tmp/dadeto-aaxq-hardening-static.log`.

`npm run build`, `npm run build:cloud`, `npm run verify:cloud-packages`: PASS;
27 packages / 713 reachable modules / 1,234 imports. Logs
`/tmp/dadeto-aaxq-{build,cloud-build,closure}.log`. No production/provider
requests or deployments; no actual local Playwright launch. Local/scoped evidence
is not full-suite/global coverage. Keep this child open for exact pushed CI.

## Mutation and harness findings

First entire-module run fails88.70%: **119 total, 90 Killed, 13 Survived, four
RuntimeErrors and 12 Timeouts**, four static mutants evaluated. Retain
`reports/mutation/playwright-runner.initial.json` and `/tmp/dadeto-aaxq-mutation.log`.
Four crashes came from stored rejects-matchers that rejected before their later
await when a mutant changed the outcome. Observe those matcher promises promptly
as well as the original runner promise, while still awaiting/asserting originals.

Driver phase assertions now fail missing launches promptly rather than silently
waiting for readiness. Native test diagnostics retain cwd rather than capturing
the full host environment. JSDoc-only first gate failures were fixed without
suppression; the test boundary uses a named options object with a documented
launcher field so the fixer does not invent an invalid root parameter.

Remove redundant nullable exit-message formatting: String(code) and signal
interpolation preserve the old primitive behavior. Readiness now initializes from the first actual fragment with an identity function,
then appends subsequent fragments through a closure. This preserves ordinary string
accumulation without an artificial empty prefix that can mutate into equivalent
leading log text. The intermediate second run failed99.08%: 109 mutants, 102 Killed,
one equivalent array-prefix survivor, six Timeouts, four static, no runtime errors;
retained `reports/mutation/playwright-runner.contracts.json`.

Final entire-module mutation **PASS100%**, 110 detected: **99 Killed and 11 Timeouts**,
four static, zero survivors/runtime errors/ignored/uncovered. Source equals the
report byte-for-byte, SHA-256
`d9da14312629cf1f6f86f603300ce7f9300b39cf9e05ab14eac8015776c9615c`.
Timeouts remove settlement/listener/append/match progress or replace readiness
digits with non-digits, leaving readiness/exit pending. This is not an all-Killed
or zero-timeout claim; no timeout budget changed. See
`reports/mutation/playwright-runner-summary.json` and
`/tmp/dadeto-aaxq-final-mutation.log`.

Concrete native adapter imports now participate in the compiler fixture. This
exposed a previously implicit-any startup handler. Generic JSDoc for both local
permission binders preserves returned types without changing runtime behavior or
adding an exclusion. Final scoped35 tests/source0gaps, all11 split static gates,
site/cloud builds and package closure pass; logs
`/tmp/dadeto-aaxq-final-{impact,static,build,cloud-build,closure}.log`.

Initial pushed revision6c903a6 passed exact Full Check40718657604. The final
accumulator/native-type hardening requires its own pushed Full Check before closure.

A separate in-memory characterization found a pre-existing simulator readiness
framing bug: a stream chunk ending in `:4` resolves port4 before later `321` finishes
4321. Owning follow-up `dadeto-y3se` requires complete-line/digit-split tests and
framing correction; extraction preserves the old protocol in this slice.

Use task scratch outside the checkout on normal storage. Preserve logs/reports;
do not remove shared caches. Existing generated-cloud package-name warnings remain
separately owned by `dadeto-5wxt`.

## Final CI receipt

Exact final hardening fcf3ddc8fc32203f09ae839debb0829b610ff6cb passed
Full Check40723133944, artifact12831582742, downloaded report
`/tmp/dadeto-full-check-40723133944/full-check-40723133944/coverage/check-full-report.md`.
1,086 suites /8,396 tests all passed; all four global and runner coverage
metrics100%, no files below thresholds. Bead `dadeto-aaxq` closes on this
revision plus the matching110-mutant acceptance. Its report is also retained as
`reports/mutation/playwright-runner.pre-framing{,-summary}.json` while the
separate `dadeto-y3se` complete-line fix advances the same source file.
