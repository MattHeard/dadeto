# Ordered world-entry lookup

Strict duplication matched actor and exit lookup's ordered search with
null-on-missing behavior. `findWorldEntry` now owns that return policy in the
world module. Actors import it; the world module does not import actors, so no
cycle is introduced. Eligibility predicates remain unchanged, preserving
map-first actor checks and short-circuited exit gates.

Direct regression checks original record identity, first eligible record,
iteration order, callback array/index arguments, empty/nullish absence, active
map filtering, and choosing a later ungated exit when an earlier one is locked.

Evidence:

- `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
  test/core/browser/game --coverage
  --collectCoverageFrom=src/core/browser/game/mosslight-valley/world.js
  --collectCoverageFrom=src/core/browser/game/mosslight-valley/actors.js`:
  100 tests in 10 suites pass; exact 100% all four metrics for both owners
  (`.tmp/world-entry-tests.log`).
- `TMPDIR=/home/matt/dadeto/.tmp npm run check -- --skip-tests`:
  strict count 86 to 85; duplication sole failure, nine other gates pass
  (`.tmp/world-entry-static.log`, terminal exit 1).
- `npm run build`: passes (`.tmp/world-entry-build.log`).

Keep lookup predicates local to their domain; sharing the return policy does
not justify changing eligibility evaluation. No ignore or threshold changes.
Full goal acceptance remains pending.
