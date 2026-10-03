# Cozy conditional flavor text

Strict cozy/ledger suffix matched cozy's conditional flavor text with empty
default. The named `getBonusText` wrapper now uses existing browser common
`withFallback`; its `randomValue > 0.8` comparison and exact suffix are unchanged.
Ledger's independent serialization policy stays untouched.

Regression checks exactly 0.8, values above it, NaN and both infinities, plus
the wrapper name. Do not normalize or clamp randomness during this refactor.

Evidence:

- `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
  test/toys/2026-04-19/cozyHouseAdventure.test.js --coverage
  --collectCoverageFrom=src/core/browser/toys/2026-04-19/cozyHouseAdventure.js`:
  15 tests pass; exact 100% all four owner metrics (`.tmp/cozy-bonus-tests.log`).
- `TMPDIR=/home/matt/dadeto/.tmp npm run check -- --skip-tests`:
  strict 81 to 80, duplication sole failure; nine other gates pass
  (`.tmp/cozy-bonus-static.log`).
- `npm run build`: passes (`.tmp/cozy-bonus-build.log`).

No ignore, exclusion or threshold changes. Goal still requires zero clones and
terminal full aggregate acceptance; focused success is not that final proof.
