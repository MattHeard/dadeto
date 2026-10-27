# Coordinate gate roots before moving typed logic

- Unexpected hurdle: a naive directory move could leave green checks that no
  longer enumerate moved source.609 tracked core JS files have985 literal
  consumers; joined path segments need separate source inspection. A single
  large documentation write also hit automatic-review timeout; its permitted
  one-time smaller census retry succeeded, followed by bounded doc writes.
- Diagnosis: traced active coverage sharder, impact/full reporting, ESLint/
  checkJs, parse, dependency/global, clones, thin wrappers, static distribution
  and cloud archives. Active configs are.jscpd.json and
  dependency-cruiser.config.cjs, not their older similarly named alternatives.
  The gitignore build exception also needs migration.
- Chosen slice: commit-pinned deterministic census and source-grounded migration
  map in docs/architecture/typed-logic-migration.md. It regenerates byte-for-byte.
  No source move, guard removal, exclusion, URL or deployment change occurred.
- Next: prove both new logic roots participate in every applicable gate before
  moving import-free checkFullReport and its two direct consumers. Then isolate
  its untrusted coverage parser with exhaustive category/mutation evidence;
  do not silently default programmer errors or remove legitimate state checks.
  The whole Rank11 stays Partial. Bead dadeto-00oe owns this inventory step.

Validation: the documented generator reproduces the JSON census byte-for-byte;
existing gate/packaging focus passes8 suites110 tests; npm run check -- --skip-tests
passes10/10 static gates (including86 manuals, zero clones and zero vulnerabilities).
The focus command names checkImpactPlan, checkFullReport, check-duplication,
check-depcruise, check-core-parse, non-core-thin/status, copyCloud and coverage-shards
tests. These establish the current baseline, not coverage of future logic paths.
