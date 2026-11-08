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
