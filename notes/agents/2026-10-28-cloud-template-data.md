# Portable cloud template data

Bead `dadeto-48hf`, child of `dadeto-e1oz`; Rank11 remains Active / Partial.

## Diagnosis and implementation

The shared template interpolator directly read files. Four cloud core modules
constructed URLs from import.meta.url to load five checked-in HTML templates.
Keep those HTML files authoritative and compile their exact text into ordinary
frozen JS string data (`src/core/cloud/templates.js`). The four consumers import
that portable data, keeping their public renderer/helper signatures unchanged.
Interpolation now takes text and has no environment access. The local JSON/HTML
rendering CLI reads the template itself before calling the pure interpolator.

`npm run cloud:templates:refresh` regenerates data; `cloud:templates:check` compares
formatted compiler output with the checked-in module and fails on drift. Core
compiler logic receives explicit readers, formatter, permission-first writer and
local effects boundary. No native import/default is introduced there. Reads and
formatting fail before writing; a write error propagates. This is not an atomic
filesystem-writer guarantee.

Both fast/full aggregate checks now include the drift command. Cloud packaging
checks it before copying any function artifacts, including test/prod workflows
that call build:cloud. infra/commonCore.js mirrors the shared aggregate command
list as a generated build artifact. Existing source/mutation exclusions and
thresholds are unchanged. The generated data module participates in coverage,
duplication, dependency and mutation checks; it is not an ignored source surface.

## Evidence and evaluator repairs

All five rendered outputs match pre-change captured bytes, including replacement
strings containing `$&`, markup and Unicode. Baseline:
`/tmp/dadeto-48hf-template-before.json`. Existing consumer-scoped evaluation passes
30 suites /372 tests, changed-module lint/parse/duplication and no uncovered lines
or branches in all seven selected modules: `/tmp/dadeto-48hf-impact.log`.

Focused compiler/interpolator/CLI/gate tests pass four suites /21 tests. They cover
serialization, source catalogue/output path, distinct invocation permissions,
check-mode non-writing, drift, read/format/boundary/write rejection, real source
parity and CLI reads/writes. `/tmp/dadeto-48hf-focused.log`.

The first mutation initial run failed because a unit compared raw generated source
with Stryker's instrumented file text. Correct the evaluator without skipping it:
unit parity compares imported template values to all authoritative HTML files;
controlled compiler tests still compare raw source, and the real raw-file check
runs separately as a static/packaging gate. The first complete run then detects
32/33 mutants (13static), leaving one static output-path string survivor because
fixtures reused the export as their oracle. Pin the literal output path and
catalogue. Preserve the initial report/log; the 100% threshold stays unchanged.

A real CLI probe in `/tmp/dadeto-cloud-template-drift-auglmoqw` changes an isolated
source HTML, checks exit1/actionable refresh command/output SHA unchanged, runs
refresh successfully, and checks exit0 afterward. No worktree source is modified
by this experiment. `/tmp/dadeto-48hf-real-drift.json`.

Static aggregate passes all11 gates; static build and cloud build/import-closure
pass (27Terraform packages,707reachable modules,1227imports). Logs:
`/tmp/dadeto-48hf-{static,build,cloud-build}.log`. Scoped aggregate-gate coverage and
final full mutation/CI receipts are recorded below once terminal.

The Acorn static-import census now leaves seven modules /17native imports in
`reports/mutation/logic-builtins-remaining.json`. This does not count JSDoc/dynamic
imports/globals and is not a global purity proof. Remaining dependency enforcement,
parse/thin preparation and source migration stay open under the parent.

Next time: distinguish runtime data equality from source-text parity when mutation
instrumentation changes files; give fixed artifact paths independent test oracles;
keep template drift checks in the actual packaging path, not only unit tests.

## Terminal mutation and gate-test receipts

Whole-module mutation passes100%:33/33Killed, including all13static mutants,
zero survivors/timeouts/ignored/uncovered. The report embeds exact current source
for all three modules; `reports/mutation/cloud-templates-summary.json` records
hashes and per-file statuses. Compiler23Killed, interpolator4Killed, data6Killed.
Compiler SHA-256 `96d5ae7bc31533cff736af0f46e7201b392bfb005490d1d70b7089e030321f3f`;
interpolator `9b2fe29d33679d2f9cf79a3220ce5459290a4d7d55c5408b05db659eeaf11603`;
data `af523482708414298f7c7c8482a2cc4295cf642f6daa4a0de9e535059891e9cc`.
Log `/tmp/dadeto-48hf-mutation.log`, engine exit0, threshold100/static enabled.

The additional scoped run for the shared aggregate command list selected613
related suites. It failed only two legacy hardcoded total-command counts; all
other611 suites passed and index.js coverage had no uncovered lines or branches.
That aggregate scoped result is preserved as FAILED, not retroactively passing.
Update the two counts from11 to12 (test impact plus11static gates) and retain the
separate assertion of the exact drift command in both fast/full lists. The final
six focused suites /78tests all pass in1.492s, including those failed cases and
compiler/interpolator/CLI/gate tests. Logs:
`/tmp/dadeto-48hf-gate-impact.log`, `/tmp/dadeto-48hf-focused-final.log`.
Avoid repeating613related tests solely to validate two assertion-number updates;
the authoritative full suite/coverage still runs asynchronously on the pushed
commit. Final local static receipt: `/tmp/dadeto-48hf-static-final.log`.

The previous runner/security children are closed using actual successful
FullCheck40651137720 at7f07f1b (artifact12799811655:1072suites8277tests/all4global
coverage100%). Those results do not validate this newer template change. Keep
this child open for its own terminal CI receipt; broader Rank11 remains partial.
