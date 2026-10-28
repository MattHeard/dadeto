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
interpolation preserve the old primitive behavior. Readiness uses fragments joined
without a delimiter; split-banner tests make that separator observable, whereas
an unrelated initial text prefix was equivalent because leading logs are allowed.
The complete final-source rerun currently has109 mutants and is independently
running in `/tmp/dadeto-aaxq-hardening-mutation.log`, with one survivor observed.
Do not claim terminal mutation acceptance from progress. No timeout was increased
and no source/regex/mutation exclusion was added.

Use task scratch outside the checkout on normal storage. Preserve logs/reports;
do not remove shared caches. Existing generated-cloud package-name warnings remain
separately owned by `dadeto-5wxt`.
