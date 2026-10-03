# Cozy narrative rendering

Strict report matched repeated newline prompt assembly in intro and yard;
the intro suffix also matched the Notion prompt. Cozy authored body lines now
live in private data arrays. One renderer joins a dynamic heading and body
without changing narrative strings or mutating authored lines.

Evidence:

- `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
  test/toys/2026-04-19/cozyHouseAdventure.test.js --coverage
  --collectCoverageFrom=src/core/browser/toys/2026-04-19/cozyHouseAdventure.js`:
  14 tests pass; exact 100% on statements, branches, functions and lines
  (`.tmp/cozy-narrative-tests.log`).
- `npm run duplication`: strict count 90 to 88
  (`.tmp/cozy-narrative-scan.log`).
- `TMPDIR=/home/matt/dadeto/.tmp npm run check -- --skip-tests`:
  duplication88 sole failure, other nine static gates pass
  (`.tmp/cozy-narrative-static.log`).
- `npm run build`: passes (`.tmp/cozy-narrative-build.log`).

Existing assertions lock exact normal narrative text; new assertions verify
newline-bearing name interpolation occurs once, empty time is preserved, and
repeated rendering is stable. No shared cross-domain story policy was invented
merely to match punctuation. Thresholds and ignore policies remain untouched.
