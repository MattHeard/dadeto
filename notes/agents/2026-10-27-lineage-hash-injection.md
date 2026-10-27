# Inject registry lineage hashing; mutation hardening remains open

Bead: `dadeto-r5hj`; parent `dadeto-e1oz`, Rank 11 Active / Partial.

## Dependency change

Core lineage parsing no longer imports node:crypto. Its required third argument
is a precisely typed UTF-8 SHA-256 function. The previous defaulted URL options
and missing-URL diagnostic remain intact. The sole production caller in the CI
composer supplies the exact previous createHash/update/digest operation and
reuses it for captured-body verification. No workflow/IAM/deployment timing or
external request changed.

Unit tests use fake digests and verify exact-body delegation and failure
propagation. The existing composer integration tests still use actual crypto.
A virtual TypeScript fixture proves omitted hashers and number-returning hashers
fail compilation; it never executes a hash. No core crypto dependency is needed
for these unit tests.

## Evidence and limits

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --coverage=false test/core/functionEndpointLineage.test.js test/scripts/compose-function-endpoint-lineage-report.test.js test/scripts/lineage-hash-contract.test.js
npm run check:impact:run -- --files src/core/build/function-endpoint-lineage.js
npm run check -- --skip-tests
npm run lint
npm run build
node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/function-endpoint-lineage.stryker.config.mjs
```

Three focused suites / 36 tests pass. Scoped coverage collects the changed parser
with no uncovered lines or branches; lint/core parse/zero clones pass. The split
local static aggregate passes all 10 gates; build passes. Logs:
`/tmp/dadeto-r5hj-impact.log`, `/tmp/dadeto-r5hj-check.log`,
`/tmp/dadeto-r5hj-lint.log`, `/tmp/dadeto-r5hj-build.log`.

Whole-module mutation is deliberately unresolved: first run 282 mutants,
243 killed / 39 survived / zero timeouts, score 86.17%, exit 1 against the
unchanged 100% break threshold. Initial report:
`reports/mutation/function-endpoint-lineage.initial.json`; active report:
`reports/mutation/function-endpoint-lineage.json`.
Survivors identify exact diagnostic/type cases, identifier anchors, timestamp
variants, optional metadata, normalization and potentially redundant conditions.
Do not call this module mutation complete or lower thresholds/exclude survivors.
Keep the owning quality Bead open and tighten the next loop using that report.
The retained harness covers the entire module, includes static mutation and
changes no global source selection.

A live sandbox under .tmp initially caused a Jest package-name collision while
running another fixture. Future runs use os.tmpdir outside the repository; the
terminal sandbox was already cleaned by Stryker. This avoids changing global
source/test exclusions. Await existing process handles before cleaning/restarting.

## Next step

Inspect each survivor against the actual source. Add discriminating parser
cases, and remove a condition only after tracing the valid typed inputs and
proving it redundant. Preserve existing external behavior. Continue through
100% full-module mutation, then record exact full CI before closing this Bead.
One more audited built-in import is removed: 13 modules / 26 imports remain.
