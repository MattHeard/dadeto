# Lazy memory-root projection

Strict memory/json-explainer suffix matched memory's conditional root object
and error return. Existing browser common `buildWhen` now owns lazy successful
construction; null coalescing retains the original error object. The source
getter runs once and the root selector runs only for accepted objects/arrays.
JSON failure-location extraction remains untouched.

Regression locks source/projection read order, root identity, projection getter
errors and invalid-source error text. Keep failure construction lazy rather than
eagerly creating a fallback before successful selection.

Evidence:

- `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
  test/toys/2026-05-28 --coverage
  --collectCoverageFrom=src/core/browser/toys/2026-05-28/memoryVector.js`:
  59 tests in three suites pass; exact 100% all four owner metrics
  (`.tmp/memory-projection-tests.log`).
- `TMPDIR=/home/matt/dadeto/.tmp npm run check -- --skip-tests`:
  strict 77 to 76, duplication sole failure; nine other gates pass
  (`.tmp/memory-projection-static.log`).
- `npm run build`: passes (`.tmp/memory-projection-build.log`).

No thresholds, ignore pragmas or exemptions added. Full zero-clone acceptance
remains pending; the canonical goal stays open.
