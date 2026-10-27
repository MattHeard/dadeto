# Lineage parser mutation hardening

Owner: `dadeto-r5hj`; Rank 11 remains Active / Partial.

## Evidence-driven changes

The whole-module baseline at pushed 4728593 reported 243 killed / 39 survived
out of 282 mutants (86.17%). The tests had full coverage but missed exact
failure categories, input type/whitespace cases, anchored IDs/digests/generations,
independent optional pins, credential components, timestamp variants and
normalization. Add those discriminating cases rather than suppressing mutants.

Both URL-map builders produce string-valued dictionaries. Per-key value equality
and matching cardinality already establish map equality; sorted key/index
comparison duplicated that work. Removed only sorting/index comparison, keeping
cardinality and value checks, with reordered maps, equal-size different keys,
changed values and an extra lexically final key tested.

The timestamp format stage is pure and total: unknown input returns a native
regex match retaining its original input, or null. The subsequent calendar check
keeps the original error and returns the original string. Focused stage tests
cover non-string primitives, symbols, objects and accepted/rejected syntax.
No opaque constructor or branded value is required. The composite parser's
existing outward validation/errors remain unchanged.

Concrete JSDoc now describes normalized GCP, registry and Netlify output fields.
The virtual TypeScript caller verifies these field types and rejects missing or
wrong-returning hash dependencies. The existing composer still validates actual
crypto hashes; core unit tests use injected digest results.

## Evaluator lessons

A nested array patch in validLineage was spread back into a valid object; direct
array assignments are needed to test rejected record categories. A trailing
newline fixture incorrectly assumed a match before the newline; actual anchored
JavaScript regex rejects it. The corrected tests assert native-format rejection
and the unchanged outward timestamp error. Do not infer format behavior from
Date.parse alone.

The first hardening mutation run improved to 280 killed / one survivor / one
timeout (99.65%). The survivor deleted the primitive format-failure guard:
Date.parse(undefined) returned NaN and masked it. Using the native match/null
parse result makes format outcome handling explicit. A timeout changed the
terraformApply success literal to empty in straight-line validation; the final
run is scheduled after static workloads, and its actual verdict must be recorded.
No threshold reduction or mutation/source exclusion is allowed.

## Reproduce

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --coverage=false test/core/functionEndpointLineage.test.js test/scripts/compose-function-endpoint-lineage-report.test.js test/scripts/lineage-hash-contract.test.js
npm run check:impact:run -- --files src/core/build/function-endpoint-lineage.js
npm run check -- --skip-tests
npm run build
node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/function-endpoint-lineage.stryker.config.mjs
```

The final focused set passes 3 suites / 89 tests. Retained report paths are
reports/mutation/function-endpoint-lineage.initial.json (baseline),
reports/mutation/function-endpoint-lineage.hardening-1.json (99.65% attempt), and
reports/mutation/function-endpoint-lineage.json (latest experiment).
The 99.65% result is a failed gate, not acceptance. Keep the Bead open until the
latest full-module mutation report and exact pushed Full Check both satisfy the
contract. Do not describe local scoped evidence as full-suite validation.


Final local code (native match/null and concrete output types): all 89 focused
tests pass; changed-source scoped coverage has no uncovered lines/branches;
all 10 split static gates and generation pass. Logs:
/tmp/dadeto-r5hj-hardening-impact.log, /tmp/dadeto-r5hj-hardening-check.log,
/tmp/dadeto-r5hj-hardening-build.log. The final mutation handle is separate and
its terminal outcome remains required; the run starts after static gates finish.
