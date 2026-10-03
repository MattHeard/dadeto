# Shared object-record policy

The strict scalar-write/spacetime-input clone repeated a non-null, non-array
object predicate. It is not a plain-object restriction: dates, class instances
and null-prototype records must continue to pass.

Use `isObjectRecord` in browser validation, composed from its existing object
and array predicates. Keep the named `isJsonObject` compatibility wrapper.
The validation regression covers accepted prototypes, rejected primitives and
arrays, the wrapper name, and revoked-proxy TypeErrors.

Evidence: `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
test/toys test/core/browser/validation.test.js --coverage
--collectCoverageFrom=src/core/browser/validation.js
--collectCoverageFrom=src/core/browser/toys/2026-05-28/memoryScalarVectorWrite.js
--collectCoverageFrom=src/core/browser/toys/2026-08-19/spacetimeInput.js`
passed 1,253 tests in 137 suites, with exact 100% on all four affected-owner
metrics (`.tmp/object-record-tests.log`). Strict duplication fell 92 to 91
(`.tmp/object-record-scan.log`); its nonzero exit remains expected until zero.

The first test attempt lacked repository-local TMPDIR and failed with ENOSPC
before Jest started. Rerunning with repository-local TMPDIR passed. A full
aggregate is pending in `.tmp/object-record-full-check.log`; do not confuse
focused success with terminal aggregate acceptance. No thresholds or ignore
policies changed.
