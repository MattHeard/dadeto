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

The numerical module was first relocated to `src/logic/core/wgs84/wgs84.js`
with identical bytes. The state repair below subsequently decomposes the solver;
the original math SHA above remains its independent reference. `src/logic/boundary/wgs84/coordinates.js` returns
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

## Portable numeric and complete deployment references

Exact-head Full Check42494712279 failed after45/56shards:7824tests,7823passed,
one failed in the frozen numeric fixture. Artifact13623067058 is retained at
`/tmp/dadeto-z85m-full-check-failure.zip`. All eleven static gates passed. The
calculation source remains byte-identical; the fixture recorded local Node24 /
aarch64 floating-point outputs while CI uses another runtime/platform. Preserve
exact compatibility by evaluating the immutable original calculation on the
same runtime as the actual calculation, rather than accepting numerical tolerance
or imposing one generating host's transcendental rounding on every host.

The 404 coordinate vectors remain. The original110-line module is stored as a
`.js.txt` test resource, pinned to the original SHA-256 above, and evaluated in an
import-free VM context. Same-process comparisons retain exact special-number and
floating-point equality. Reproduce the immutable source resource with:

`node test/fixtures/typed-logic/generate-wgs84-numeric-baseline.js --source > test/fixtures/typed-logic/wgs84-math-baseline.js.txt`

The input-vector generator still regenerates the JSON fixture byte-for-byte.
Current five focused suites pass23 tests with all four destination/adapter
coverage metrics100. Fresh authoritative CI remains required for the portability
fix; do not describe the earlier failed workflow as passing.

The complete cloud deployment-effect oracle is generated independently from the
immutable pre-migration cloud builder, SHA-256
`a650a9920470dd785a1d7d6fd4f4ad64eb51603225303aa82a455f2d21c9ede2`.
Two scenarios capture all1180ordered copies,192directory reads,276rewrite reads,
27/303writes and0/276rewrite messages. Compare every ordered effect using counts
and SHA-256 digests. The seven new WGS84 copies are checked explicitly before
restoring exactly the original three-entry tail for the baseline comparison;
there is no broad path filter or exemption for other deployment changes.

`node test/fixtures/typed-logic/generate-cloud-copy-baseline.js` regenerates the
compact JSON reference; add `--full` to inspect complete effects. The loader must
rewrite only actual import/export specifier AST nodes. An initial regex loader
also rewrote generated export-template text; the reference comparison caught the
mismatch before publication, and AST-directed replacement fixed it. Do not treat
that loader bug as a production copy difference or mask differing output hashes.

The original complete1366-mutant run stopped during a later session gap: its
handle and PID644294 are gone, no workers or terminal report remain, and the log
ends at924tested/501survived. Cause is not established. Preserve
`/tmp/dadeto-z85m-validated-mutation.log` as interrupted partial evidence only;
no final score is claimed. A new run is justified by authoritative process absence
and strengthened references, not merely by an expired observation handle.

## Fourteen-survivor repair

The complete strengthened-reference run finished98.98%, wrapper1:1351Killed,
14Survived and1Timeout,110static,1366total. Every embedded source matched published
1b8e304b1a. Preserve `reports/mutation/wgs84.hardened-reference-failed.json`,
SHA-25623bcd010af063e5bd0591dba56e78d3c91413facf86822ed6f6f1be9b3082ea6,
and `/tmp/dadeto-z85m-hardened-mutation.log`. This is failed evidence, not acceptance.

Six browser-copy survivors expose missing workflow/destination assertions. Add
exact content-blog-data directory pairs, all seven browser-tree copy destinations,
and execution of all seven WGS84 copies in the actual workflow. Three cloud
survivors expose a masked batch-only error: isolate a single batch read failure
so another rewrite cannot satisfy the assertion. EACCES propagates unchanged;
ENOENT remains the existing missing-file policy.

The other two cloud survivors are not universally redundant rewrites. Input
`../.../commonCore.js` becomes `../../commonCore.js` after the preceding substring
replacement; the later entry is still required. Preserve the production table and
add that third independent original-source scenario. New reference SHA-256 is
b33f1a58f00583cea9524cd39db09a6d35011de7944270147e8b0cfd3bd0c6b5.
Do not remove a rewrite merely because ordinary fixtures hide it.

The solver's duplicate upper bound and i===99 fallback hide a permissive bound
mutation. Use one100-iteration owner, then the original spherical fallback.
Coincident points retain their legitimate early return through an explicit
coincident-or-iteration outcome with required arc data. Successful convergence
consumes that actual arc, replacing fabricated intermediate initial values.
A pure convergence predicate makes the original strict1e-12 boundary explicit.
The first decomposition hit the arity guard; use four actual angular inputs and
a separate arc-correction operation rather than packing more scalars into a bag.
No rule or threshold is exempted.

The valid coordinate witness `[16,0,-15.5,179.48]` converges only on iteration101.
At iteration100 its delta is1.049826892085548e-12; at101 it is8.36664071357518e-13.
The original100-bound fallback is19958756.206768177meters; extending convergence
returns19935759.46217679. Reproduce this diagnostic against pinned original bytes:

`node test/fixtures/typed-logic/wgs84-iteration-probe.js`

All prior cases remain, with this extra vector:405 numeric vectors and24714broad
outcomes, digest9d190abc62423e219a98f39d0fb1514d535297d4db7a7a26c9c368fa4be52195.
Seven focused suites pass75tests with all four metrics100 on the four destination /
adapter modules. Related selection passes37suites384tests. For related discovery,
use `--roots src test`; `--roots test` omits source graph nodes and selects nothing.
All eleven repaired local static gates pass. Site/four-public-module checks and
cloud assembly/27packages711modules1231imports pass on the repaired source.
New core source SHA-256 is7682d7a2d8e25b95254c33a2297aba2931fb872b2a5d93177e09eaa60ab0faa8.
Fresh exact CI and a complete mutation run remain required for this source.
