# Fake storage platform injection — 28 October 2026

Owning Bead: `dadeto-plm8`, child of Rank 11 / `dadeto-e1oz`.

## Change and evidence

Core storage is now a class factory with required filesystem, path, byte-conversion
and invocation-boundary ports. It has no native imports or Buffer dependency. The
local facade preserves `new FakeStorage({rootDir})`, bucket/file metadata and the
SDK save/exists/download API. Native downloads still return Buffer; portable tests
use Uint8Array, and compiler fixtures prove caller-specific byte types survive.

Every bound SDK save obtains an invocation permission and passes that same token
to directory creation and writing. Queries preserve their previous behavior.
Errors propagate at the original point; no extra write follows a failed boundary,
mkdir or conversion. Tests cover Unicode, Buffer, sliced byte views, path mapping,
isolation and exact read/write/token order.

The simulator now requires its storage constructor from the local boundary and
rejects a missing constructor before allocating temporary storage. A pure lazy
entrypoint binds defaults and gates its injected startup constructor with an
AllowEffects permission. Public native simulator exports and route bindings stay
compatible. Tests allocate no real directory when checking failure order.

Executed final evaluators:

- `TMPDIR="$PWD/reports/tmp/fake-storage" npm run check:impact:run -- --files
  src/core/local/gcp-simulator/fake-storage.js
  src/core/local/gcp-simulator/simulator.js
  src/core/local/gcp-simulator/simulator-entrypoint.js`: PASS, 10 suites / 51 tests;
  no uncovered lines or branches in any of the three selected modules; lint, parse
  and zero-clone gates pass. Log `/tmp/dadeto-plm8-impact-final.log`.
- `npm run check -- --skip-tests`: all 11 static gates PASS, including unchanged
  audit and zero clones. Log `/tmp/dadeto-plm8-static-final.log`. This split local
  check is scoped evidence, not global full-suite coverage.
- `npm run tsdoc:check`: PASS after the final token compiler contracts;
  `/tmp/dadeto-plm8-types-final.log`.
- `TMPDIR="$PWD/reports/tmp/fake-storage" node --experimental-vm-modules
  ./node_modules/.bin/stryker run docs/quality/fake-storage.stryker.config.mjs`:
  PASS, 23/23 Killed, one static mutant evaluated, zero timeouts, survivors, ignored
  or uncovered. Both entire modules are mutated; no new source/mutation
  suppression, timeout increase or threshold change.
  Report `reports/mutation/fake-storage.json`, source/hash/count receipt
  `reports/mutation/fake-storage-summary.json`, log `/tmp/dadeto-plm8-mutation-final.log`.
- `npm run build`, `npm run build:cloud`, `npm run verify:cloud-packages`: PASS;
  27 packages / 707 reachable modules / 1,227 imports. Logs
  `/tmp/dadeto-plm8-{build,cloud-build,closure}.log`. No deployment, production
  request or local Playwright execution.

The owning child stays open until its exact pushed Full Check succeeds.

## Unexpected hurdles and next-time guidance

The first static run found the native simulator wrapper exceeded the 50-line
shape/size policy. Its original leading barrel export also masked wrapper-shape
validation. Use a genuine lazy core factory and keep a real invoked `const handle`
in the thin wrapper; do not restore the barrel-prefix bypass or add exemptions.
The existing exemption list and thresholds were unchanged.

A fresh Jest cache reported duplicate generated Cloud Function package names.
This warning has a separate owning Bead, `dadeto-5wxt`; no test/source exclusion
was added to hide it. Use workspace-local TMPDIR under ignored `reports/tmp` for
Jest/Stryker on this host because the shared 2GiB /tmp previously filled. Do not
delete shared caches or another task's data.

Fresh static-import census: five core modules / 12 native import declarations,
recorded in `reports/mutation/logic-builtins-remaining.json`: staticJsonlTable(2),
billing-runtime-core(1), simulator/playwright-runner(3), simulator/server(2),
simulator/simulator(4). This is a static import inventory, not proof of no globals.
The existing legacy simulator blanket mutation directive and native lifecycle
imports remain parent prerequisites; the new entrypoint and storage factory are
fully mutated. Observable native-import enforcement, trusted boundary parsing,
namespace preflight and actual migration remain unfinished.

## Exact CI receipt

Full Check [40664346982](https://github.com/MattHeard/dadeto/actions/runs/40664346982)
succeeded at `396f9a19baf4f6fba11ee0cfad7d3d8ddd8168d0`. Artifact
`12805293659` / `full-check-40664346982` confirms 1,078 suites / 8,328 tests
all passed and 100% across all four global coverage measures and each of the three
changed core modules. No files are below thresholds. Downloaded report:
`/tmp/dadeto-full-check-40664346982/coverage/check-full-report.md`.
Combined with the exact-source 23/23 mutation and local/build evidence, this closes
`dadeto-plm8`. The parent/spec remains unfinished.
