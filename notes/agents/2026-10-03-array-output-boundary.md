# Toy array-output failure boundary

Strict titles/asset-candidate pair repeated serialization and catch-time empty
array serialization. `runToyArrayCalculation` owns those two operations in
formatToyError. Titles retain their existing gathering policy; candidate
filtering now returns its calculated array before serialization. Candidate
ordering, deduplication, interval rules and malformed-request defaults remain.

Do not hardcode the fallback string: the old boundary called JSON.stringify
again. A success serialization failure must trigger fallback serialization,
and a fallback serialization failure must escape. Direct tests lock both.
Obsolete asset calculation mutation-ignore comments were removed; none added.

Evidence:

- `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
  test/toys test/core/browser/toys --coverage
  --collectCoverageFrom=src/core/browser/toys/formatToyError.js
  --collectCoverageFrom=src/core/browser/toys/2025-07-05/getDend2Titles.js
  --collectCoverageFrom=src/core/browser/toys/2026-08-20/assetPossessionSegmentCandidateFilter.js`:
  1,284 tests in 138 suites pass, exact 100% all four metrics for three owners
  (`.tmp/array-boundary-tests.log`).
- `TMPDIR=/home/matt/dadeto/.tmp npm run check -- --skip-tests`:
  strict 82 to 81, duplication sole failure; nine other gates pass
  (`.tmp/array-boundary-static.log`).
- `npm run build`: passes (`.tmp/array-boundary-build.log`).

No threshold, exclusion or exemption changes. Zero-clone/full aggregate goal
acceptance remains pending.
