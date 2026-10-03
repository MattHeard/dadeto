# First-key uniqueness for toy collections

The strict Dijkstra/Conway suffix matched Conway's first-cell deduplication
loop. `uniqueByKey` in browserToysCore now retains first values in encounter
order using an insertion-ordered map. Conway projects coordinate keys; asset
candidate filtering projects ID keys before its unchanged lexical sort.
Dijkstra's queue policy is untouched.

Direct regressions lock original first-record identity, encounter order,
projection of every entry (including duplicates and sparse iterable positions),
empty input and SameValueZero key handling. Do not use Array.filter/reduce
without considering holes: the previous for-of loop visited them.

Evidence:

- `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
  test/toys test/core/browser/toys --coverage
  --collectCoverageFrom=src/core/browser/toys/browserToysCore.js
  --collectCoverageFrom=src/core/browser/toys/2026-06-22/conwayLife.js
  --collectCoverageFrom=src/core/browser/toys/2026-08-20/assetPossessionSegmentCandidateFilter.js`:
  1,287 tests in 138 suites pass; exact 100% all four metrics for three owners
  (`.tmp/keyed-unique-tests.log`).
- `TMPDIR=/home/matt/dadeto/.tmp npm run check -- --skip-tests`:
  strict 78 to 77, duplication sole failure; nine other gates pass
  (`.tmp/keyed-unique-static.log`).
- `npm run build`: passes (`.tmp/keyed-unique-build.log`).

No threshold, ignore or exemption changes. Full goal acceptance remains pending.
