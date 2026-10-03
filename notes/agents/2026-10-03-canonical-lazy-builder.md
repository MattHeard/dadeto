# Canonical lazy conditional construction

The strict get/ticTacToe import pair exposed two homes for the same lazy
conditional construction policy. Browser `buildWhen` now delegates to canonical
commonCore `whenOrNull`, retaining its named compatibility wrapper. TicTacToe
uses the browser builder for terminal-state construction. This is shared policy
ownership, not import sorting or renaming to hide a match.

Direct regression locks false-null without callback execution, one successful
callback, exact falsy/undefined/object result identity, thrown-value identity,
and the public wrapper name.

Evidence:

- `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
  test/toys test/core/browser/toys test/browser/common.test.js --coverage
  --collectCoverageFrom=src/core/browser/common.js
  --collectCoverageFrom=src/core/browser/toys/2025-04-06/ticTacToe.js`:
  1,293 tests in 139 suites pass; exact 100% all four metrics for both owners
  (`.tmp/lazy-builder-tests.log`).
- `TMPDIR=/home/matt/dadeto/.tmp npm run check -- --skip-tests`:
  strict 76 to 75, duplication sole failure; nine other gates pass
  (`.tmp/lazy-builder-static.log`).
- `npm run build`: passes (`.tmp/lazy-builder-build.log`).

No thresholds, ignore pragmas, exemptions or exclusions added. Final zero-clone
full aggregate acceptance remains required.
