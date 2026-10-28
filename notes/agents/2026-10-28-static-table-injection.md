# Static JSONL table source injection — 28 October 2026

Owning Bead `dadeto-xr8f`, under Rank 11 / `dadeto-e1oz`.

## Change

The table core now has a required-dependency factory for source reads, path
resolution/absolute-path validation and the authored data root. Native fs/path/cwd
are supplied by the thin build facade. The core generator receives its table
renderer explicitly; binding it before the two-argument blog renderer preserves
the public `src/build/generator.js` API and authored body position. Comparator
compatibility exports stay shared with tableCore. No writes or live requests are
introduced. Validation, source-specific errors/causes, sorting, projection and
escaping retain their previous behavior.

## Evaluator evidence

The red factory regression initially failed on its missing export:
`/tmp/dadeto-xr8f-red.log`. The implementation then passes four focused suites /
30 tests, including fake paths/readers, factory isolation, exact read errors,
validation-before-read and both generator entrypoints without native data.

Final selected evaluation:
`TMPDIR="$PWD/reports/tmp/static-table" npm run check:impact:run -- --files
src/core/build/staticJsonlTable.js src/core/build/generator.js` passes 99 suites /
210 tests; both changed core modules have no uncovered lines/branches; scoped
lint, parse and zero-clone gates pass. Log `/tmp/dadeto-xr8f-impact-final.log`.

`npm run check -- --skip-tests` passes all 11 local static gates, including
unchanged audit, wrapper policies and source-port compiler contracts; log
`/tmp/dadeto-xr8f-static-final.log`. This is split fast local evidence, not
authoritative global coverage. `npm run build` regenerates **1,120 byte-identical
files**, with before/after hashes compared by path; receipt
`reports/mutation/static-table-output-parity.json`, baseline
`/tmp/dadeto-static-table-before.json`, build `/tmp/dadeto-xr8f-build.log`.
`npm run build:cloud` and `npm run verify:cloud-packages` pass unchanged
27 packages / 707 modules / 1,227 imports; logs
`/tmp/dadeto-xr8f-{cloud-build,closure}.log`.

Whole static-table mutation is independently running with static evaluation
enabled and thresholds 100 in `docs/quality/static-table.stryker.config.mjs`.
Initial dry run failed because the isolated run lacked the real authored JSONL
fixture; add that fixture to the sandbox rather than skip its native contract
tests. This failed run is `/tmp/dadeto-xr8f-mutation.log`, not acceptance. The
complete run `/tmp/dadeto-xr8f-mutation-final.log` has 163 mutants and survivors
observed; final hardening and exact pushed Full Check are still required before
closing this child. No new mutation directive, threshold relaxation or source
exclusion has been added. No local Playwright, deployment or production request.

## Unexpected hurdles and next loop guidance

The first scoped run passed all 210 tests and source coverage but lint rejected
the generator's effective arity of five. Bind the renderer dependency before
invocation rather than hide parameters in a new object or weaken the rule.

Adding a direct generator compiler fixture exposed its pre-existing explicit
`tsconfig.jsdoc.json` exclusion and numerous legacy post/body/link/media annotations,
registry narrowing and a title function annotation. Follow-up **`dadeto-xyth`** owns
meaningful typing and exclusion removal. This slice retains the actual table-source
compiler contracts plus runtime/scoped generator coverage; it does not claim the
legacy generator is type checked or trusted-boundary migration is complete. The
existing exclusion list was not edited. Do not use a new suppression, any bag or
unproven trusted-type cast to close that follow-up.

Automatic approval review briefly failed due to its own usage quota; a normal
reviewed retry succeeded. No alternative tool was used to bypass it. Workspace
TMPDIR avoids the small shared /tmp volume.

## Injection landing and hardening

Injection `a47308e90d4dfce6454bfde7dcaf91338a5ee53a` is pushed. Exact Full Check
[40702371651](https://github.com/MattHeard/dadeto/actions/runs/40702371651) was
confirmed running; it does not yet validate later hardening.

First complete mutation run failed: **163 total / 127 Killed / 35 Survived /
one RuntimeError**, five static. Report `reports/mutation/static-table.initial.json`.
Survivors exposed missing independent assertions for labels/text/script escaping,
exact multi-row markup, later-column comparison and stable source-order ties,
physical error line numbers/causes, whitespace-only lines, primitive rows and
columns, finite-number rejection and own type fields for inherited column names.

The RuntimeError emptied the factory body, making the native facade fail during
test-module import. Native fixture imports now run in beforeAll, so this is a
failed test hook rather than test-runner startup. No native contract case was
removed. The duplicate SUPPORTED_TYPES membership was removed; the explicit
type guard still narrows/accepts exactly strings and finite numbers. No skipped
mutants, source exclusions, lower threshold or increased timeout.

Added independent regression cases pass **five focused suites / 47 tests**.
Final hardening scoped evaluation passes **100 suites / 227 tests**, with no
uncovered lines/branches in table and generator, lint/parse/zero clones pass.
`npm run check -- --skip-tests` passes all 11 gates after fixing the new test
helper's JSDoc tag formatting. Site output remains **1,120 byte-identical files**
with no missing paths. Logs `/tmp/dadeto-xr8f-hardening-{focused,impact,static-final,build}.log`;
parity `reports/mutation/static-table-output-parity.json`.

Final whole-source mutation has 157 mutants and is still running. Do not claim
it passed from its live progress counter. Its source must match the report before
closure, and the hardening commit requires its own successful Full Check.

The current static import inventory leaves **four modules / 10 imports**:
billing-runtime-core(1), simulator/playwright-runner(3), simulator/server(2),
simulator/simulator(4). Legacy generator type-check exclusion (`dadeto-xyth`),
existing broad mutation directives, observable prohibition and migration remain
explicit parent prerequisites.
