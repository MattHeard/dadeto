# Istanbul coverage-fold source baseline

Owner: `dadeto-nssq`; related test portability bug: `dadeto-becy`.
The canonical typed-logic architecture remains Active / Partial.

## Actual source and scope

Immutable baseline `bd05ee9acb946e77b1f0a338295a0dbb9a82e809` contains legacy impact module SHA256
`ff612b63219d311046f734737be5809480ddd6162335c830d6a2f6cff36424df`. Actual computation comprises mergeCoverageRecords,
mergeCoverageRecord, addCoverageCounters and addCoverageBranches;
createScopedCoverageReport is its real consumer. The intended destination is
`src/logic/core/local/coverage-records.js`, with one owner for Istanbul types.
Move actual bodies and update imports, not a forwarding implementation.

Retain empty-fold undefined, structuredClone of the first record and its native
errors, first metadata retention, input non-mutation, shard/key ordering, missing
counts/arms and exact numeric behavior. Existing absence and missing-counter
branches describe meaningful state; no guard removal is part of this slice.
Raw JSON decoding, paths and source-location interpretation remain outside this
computation. The native JSON reader still returns a broadly typed object; this
initial source relocation cannot establish complete untrusted-input validation.

## Independent evaluator

`node test/fixtures/typed-logic/coverage-fold-equivalence.js` checks pinned Git
source bytes, rewrites actual import declarations with Babel, and exposes actual
private helpers without copying their implementation. It compares original and
current code in one native runtime. Canonical tagged semantic JSON retains
numeric specials, own-key order, holes, map/date types and graph aliasing. Deep
strict equality, input non-mutation and clone checks remain, with nine independent
negative controls. Two separate native processes produce identical reports.

- 2955 complete folds, metadata/order/clone/non-mutation checks:
  `d9949edaf30999cc64b9adc651e93dcf2a3bdac6978305a7b276fb7244a47a3c`.
- 128 counter/branch pairs: `fd44aa87a6c24319e00feff654082da1a3c2dc3b5cf0881a423c151e8a8a653b`.
- 10 original getter-failure/clone-error probes.
- 576 complete public CLI/effect outcomes:
  `72f6640da5873ce183e784f9a341fe66718b786428eff73e48c98d48f7c8c6e5`.

Log: `/tmp/dadeto-nssq-fold-canonical-final-a.json`. Keep the immutable reference unchanged
after moving the current-side loader to the actual destination. Three existing
contract suites pass774tests after the related harness correction.

## Unexpected hurdle and chosen repair

Before any production edit, an existing no-coverage fallback test failed because
it searched the complete command text for coverage and matched this checkout
name. Bug `dadeto-becy` records the failure in
`/tmp/dadeto-nssq-existing-contracts.log`. Inspect only `--` option tokens and
match coverage case-insensitively so collectCoverage remains prohibited too.
Fixture filenames now contain coverage, making the old assertion fail even in a
checkout without that word. No fallback behavior or prohibition was weakened.
Repaired suites pass in `/tmp/dadeto-nssq-existing-contracts-repaired.log`.

Worktree creation reports the historical mixed-prefix Beads import warning. Use
the shared checkout for all tracker operations; do not copy or reinitialize its
database. Installation audit reports zero vulnerabilities. Required local static
aggregate outcome is recorded in the bead. No source migration, mutation or CI
acceptance is claimed by this compatibility checkpoint.

## Fingerprint diagnosis

A lint-only cleanup changed the original V8 binary fold digest while every
semantic comparison and corpus count still passed. Do not equate opaque serializer
bytes with semantic identity. [Node V8 serialization documentation](https://nodejs.org/api/v8.html#serialization-api)
explicitly allows equal values to serialize differently. No specific internal
cause is claimed. The old V8 reports remain historical diagnostics, not golden
expectations. Canonical encoding is deliberately limited to the fixture domain
and rejects unsupported primitive/class shapes instead of erasing them. Negative
controls distinguish zero/negativezero, NaN/null, absent/null, holes/undefined,
key order, maps/dates and shared versus duplicated graph nodes.

The first aggregate also found max-depth/consistent-return warnings in the new
corpus helper. Flatten alias assertions and explicitly return the failing branch
rather than suppress lint or remove cases. The final required local aggregate
receipt is recorded in the owning bead. Production source remains unchanged at
this checkpoint; actual core extraction and complete mutation/CI remain pending.

Final baseline acceptance: both native reports compare byte-identically
(`/tmp/dadeto-nssq-fold-canonical-final-{a,b}.json`), with all2955/128/10/576
cases and nine semantic distinction controls. Repaired774contract tests pass.
`npm run check -- --skip-tests` exits0 with all11gates passed,
`/tmp/dadeto-nssq-baseline-check-final.log`. `git diff --exit-code -- src`
confirms no production source changed. Both nssq and becy remain open for the
subsequent actual source extraction and exact full CI before closure.

## Actual trusted source prepared

All four actual helpers and Istanbul typedef ownership now live in
`src/logic/core/local/coverage-records.js`. Only the public fold is exported; the
legacy reporter imports it and removes former implementations and local duplicate
types. Optional keyed counter inputs use Partial<Record<...>> to describe actual
missing-key state. No runtime guard, coercion, default or cast was added. All four
function parameter/body runtime ASTs equal the immutable original.

The current-side native corpus exposes actual destination helpers without copying
their bodies, and observes public CLI factories separately. Its complete canonical
report remains byte-identical:2955fold/128helper/10error/576CLI cases. Four focused
suites pass794tests with all four metrics100% on both entire changed modules:
`/tmp/dadeto-nssq-relocated-focused-repaired.log`,
`reports/coverage/coverage-records/coverage-summary.json`. The actual native scoped
command passes with both requested files collected and no coverage gaps:

`npm run check:impact:run -- --files src/logic/core/local/coverage-records.js src/core/local/checkImpactPlan.js`

Log: `/tmp/dadeto-nssq-native-scoped-check.log`. All11 local gates pass in
`/tmp/dadeto-nssq-relocated-check.log`. Both complete/compact mutation harnesses
retain their prior scopes and include the entire new module and its direct tests.
Complete nine-module mutation/static100 and exact full CI remain pending.

## Existing inherited-key contract gap is not fixed here

One new expectation incorrectly assumed prototype-named counters were numeric.
The immutable original and relocated code both read inherited right-side defaults:
merging own __proto__:2 against a map lacking that key produces the string
2[object Object]; constructor:3 similarly concatenates native Object function
text. Preserve this observed behavior in the source move. Bug `dadeto-ef2o` owns
explicit own-key/domain semantics, caller/input-boundary trace and accurate types.
No prototype mutation or security exploit is claimed. The generic numeric Record
contract is not established for arbitrary prototype-named raw IDs; neither this
move nor passing coverage proves whole-pipeline input validation. The raw JSON
reader and this contract gap remain unfinished architecture work.

Correct only the expectation, not production behavior. Initial failed proof:
`/tmp/dadeto-nssq-relocated-focused.log` (793pass/1wrong expectation); the repaired
suite and independent corpus both preserve the original outcomes exactly.

Site/cloud assembly and27package/711module/1231import verification pass:
`/tmp/dadeto-nssq-{site-build,cloud-build,cloud-imports}.log`. The fresh complete
mutation launch writes `/tmp/dadeto-nssq-mutation.exit` as well as its log, so a
later process-handle reset does not require guessing the wrapper status. Inspect
that receipt and the complete report statuses/source bytes before acceptance.
