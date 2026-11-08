# WGS84 typed-logic migration

Owner: `dadeto-z85m`; parent Rank 11 remains Active / Partial.
Baseline: `bde25b950cf237a1e0b65a4e4a6d2e7ef0f8e2b1`.

Before changing source, run the independent immutable-Git oracle:

`node test/fixtures/typed-logic/wgs84-equivalence.js`

It loads the baseline math and public wrapper from Git objects, then compares
24,711 exact outcomes against current modules. The corpus includes latitude /
longitude grid endpoints, deterministic non-grid coordinates, antipodal fallback,
non-finite values, negative zero, numeric strings, malformed primitives and
objects, coercion order and original thrown errors. Exact Object.is comparisons
avoid masking numerical changes with tolerance. Current digest is
`770fe7528e2901981a40857a2474b4cb973d6c24c29583a549703547aa406010`.
Baseline math SHA-256 is
`6cda895a0da07966efca249646611f07b473e2e0ad6697ee0f485f660548988f`;
public wrapper SHA-256 is
`493d49e8cd215cd89614b66a156315f4794d9493032a575c5c3c044a33168309`.
The harness accepts a full immutable baseline SHA and optional relative current
public/math module URLs. Keep the baseline independent of the migrated source.

The unexpected hurdle is a pre-existing static packaging omission. Actual
`npm run copy` succeeds but produces only `public/core/wgs84.js`; its import
`./wgs84/index.js` is absent, as is the math module below that directory. A real
Node ESM import fails with ERR_MODULE_NOT_FOUND. This is not a new move failure:
the checked-in blog copy plan omits the directory, while the cloud copy plan
explicitly includes root, index and math. Reproduce the output contract with:

`node test/fixtures/typed-logic/verify-wgs84-browser-imports.js`

That diagnostic is expected to fail until packaging is repaired. It checks all
three stable published paths and actual exports/results, not only copy-plan
metadata. Preserve these URLs through the migration using build output contracts;
do not leave a legacy source forwarding tree or edit ignored generated files.

Next source work moves the actual number-only calculation into trusted core and
numeric interpretation into a total boundary with explicit success/error results.
Keep the public throw/ordering behavior in thin composition, rather than treating
coercion failures as defaults. Update service-area, toy distance reexports and
segment measurements, then trace browser and Terraform archive copies. Required
acceptance remains all-four changed-module coverage100, complete relevant
mutation with static enabled and no skips, local aggregate, actual site/cloud
packaging and import verification, and exact full CI. This checkpoint establishes
compatibility/packaging evaluators; it does not claim the migration is complete.

## Actual source migration prepared

The numerical module now lives at `src/logic/core/wgs84/wgs84.js`, byte-identical
to the original math SHA above. `src/logic/boundary/wgs84/coordinates.js` returns
a total success/error outcome from the original four Number conversions in their
original order. Thin `src/adapters/wgs84.js` composes the result, propagates the
original failure, and calls trusted calculation. All former WGS84 source modules,
including the old toy reexport, are removed.

The first aggregate correctly rejected legacy-core imports of the outer adapter.
Do not weaken that direction rule. Service-area coordinates already pass the
finite numeric normalizer; circle point values pass map(Number); segment duration
and assignment callers explicitly call Number for all four arguments. They now
consume the number-only calculation directly, removing only duplicate conversion
of values already proven numeric. The public coercing API stays outside logic.

`src/logic/core/build/wgs84-assets.js` supplies one complete seven-asset plan to
both builders. Real source modules retain their paths within artifacts. Four
build-only compatibility templates preserve the three published WGS84 modules
and the dated public toy URL. This repairs the existing missing browser imports
without keeping legacy source forwarding trees. Explicit Git ignore negations
keep the new logic build helper and its tests in normal tracking/discovery.

Independent 24,711-case parity is unchanged. The numeric Jest fixture is generated
from the immutable Git source, never current computation. Regenerate it with:

`node test/fixtures/typed-logic/generate-wgs84-numeric-baseline.js > test/fixtures/typed-logic/wgs84-numeric-baseline.json`

Its 404 vectors compare exact floating-point and special-number outputs in the
same process as mutation instrumentation. The separate broad compatibility CLI
also preserves public coercion and errors. Four focused destination suites pass
21 tests and all four metrics100 on math, parser, asset plan and thin adapter.
The related-consumer run passes 35 suites /362 tests. After the direction repair,
all eleven local static gates pass, including unchanged dependency enforcement,
TypeScript, parser policies, thin integration and zero clones.

Actual site assembly and all four published WGS84 module imports pass. Actual
cloud assembly and the verifier pass for 27 Terraform packages, 711 reachable
modules and 1,231 imports. The object-minute-rental-search Terraform archive
uses infra/cloud-functions/object-minute-rental-search; the assembled service-area
module directly imports the relocated trusted calculation within that archive.

The changed cloud builder previously had blanket inline mutation skips covering
manifest and integration calls. They are removed rather than hiding the new
shared-plan call inside an inherited exclusion. The focused mutation config
includes six complete modules: math, parser, asset plan, adapter and both full
builders, with static enabled, break100 and no skips. Complete mutation and exact
published Full Check remain required; no terminal mutation score is claimed yet.

The first complete mutation bootstrap generated 1,366 mutants but failed before
mutation execution: the retained cloud-builder clean-checkout test copies four
tracked infra assets and two source-contract suites, which the focused sandbox
had omitted. Include those exact files and Babel config in sandbox availability;
keep the test and complete mutation scope intact. Failed log:
`/tmp/dadeto-z85m-complete-mutation.log`. This is not a mutation score. A subsequent
run must prove the initial suite passes before any score can be accepted.

The second bootstrap supplied those files, then exposed a distinct pre-existing
source-contract limitation: two cloud-browser tests assert exact JavaScript
manifest formatting. Instrumentation correctly rewrites that representation, so
the unmutated run fails before mutation execution. Keep the tests; replace their
raw-source expectations with actual injected copy/read/mkdir effects for admin,
deep browser modules, common core, express, generate-stats and errors. Retain
Terraform assertions and generated-file absence negative controls. The repaired
three-suite contract run passes22 tests. Prove an instrumented initial-only run
passes before retrying the expensive complete scope. Both failed logs are kept;
neither has a terminal mutation score.
