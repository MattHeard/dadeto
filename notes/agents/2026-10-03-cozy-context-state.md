# Cozy context-state assembly

Strict duplication matched the state/list spread in both presentation and
persistence. `createContextState` now owns that assembly; each caller still
uses its original transition/persistence boundary. Context arrays retain their
identity and inventory is read before progress. Transition and saved-envelope
field order remain unchanged.

Evidence:

- `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
  test/toys/2026-04-19/cozyHouseAdventure.test.js --coverage
  --collectCoverageFrom=src/core/browser/toys/2026-04-19/cozyHouseAdventure.js`:
  13 tests pass, exact 100% all four owner metrics
  (`.tmp/cozy-context-tests.log`).
- `npm run duplication`: 91 to 90 strict clones
  (`.tmp/cozy-context-scan.log`, expected nonzero until zero).
- `TMPDIR=/home/matt/dadeto/.tmp npm run check -- --skip-tests`:
  other nine gates pass, duplication90 sole failure
  (`.tmp/cozy-context-static.log`).
- `npm run build`: passes (`.tmp/cozy-context-build.log`).

Prior shared-object checkpoint full aggregate also terminated: nine browser
tests and all unit shards pass, exact global 100% all four metrics, duplication91
the sole outer failure (`.tmp/object-record-full-check.log`). That full result
predates this cozy refactor and is not final goal acceptance.
