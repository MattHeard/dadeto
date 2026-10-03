# Record parser fallback schema

The co-change/scheduler parser pair repeated malformed/non-record fallbacks.
An initial shared JSON boundary left caller-owned fallback object suffixes and
introduced an import clone: the strict total stayed 85, so that was not accepted
as a reduction. The tightened boundary owns fresh empty-array construction from
field-name schemas. Caller normalizers still control successful projection.

`parseToyRecord` retains normalization inside the failure boundary. Co-change
preserves absent `changeSets` as undefined; scheduler still normalizes its two
arrays. The toy facade re-exports the unchanged `common.isObject` guard, not a
replacement plain-object policy. Existing test facade parser names remain.

Fallback array typing initially inferred `never[]`; annotate the actual fresh
arrays as `unknown[]` so the generic field-name record type is sound. Do not
add a suppression or cast through unknown to hide the diagnostic.

Evidence:

- `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
  test/toys test/core/browser/toys --coverage
  --collectCoverageFrom=src/core/browser/toys/browserToysCore.js
  --collectCoverageFrom=src/core/browser/toys/2026-06-15/changeTogetherExplorer.js
  --collectCoverageFrom=src/core/browser/toys/2026-06-15/conflictAwareProductScheduler.js`:
  1,281 tests in 138 suites pass; exact 100% all four metrics for three owners
  (`.tmp/toy-record-tests-accepted.log`). Direct tests cover malformed and
  non-record inputs, fresh arrays, missing fields, normalizer and getter errors.
- `TMPDIR=/home/matt/dadeto/.tmp npm run check -- --skip-tests`:
  strict count 85 to 83; duplication sole failure, nine other gates pass
  (`.tmp/toy-record-static-accepted.log`).
- `npm run build`: passes (`.tmp/toy-record-build-accepted.log`).

No thresholds, exclusions, exemptions or ignore pragmas added. Removed the
obsolete scheduler parser mutation-ignore comment with its duplicated block.
Full aggregate acceptance and zero clones remain required for goal completion.
