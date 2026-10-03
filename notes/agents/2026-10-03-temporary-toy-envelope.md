# Temporary toy-state envelope

Strict cyberpunk/cozy and cozy/runner matches repeated temporary toy-envelope
construction. `createTemporaryToyEnvelope` now owns the two-level wrapper in
browserToysCore. Adventures still assemble their state fields in original order
and call their original setter. Cyberpunk still copies visited entries; neither
adventure gains a new reader, clone operation or merge policy.

Direct regression checks fresh wrappers, exact state reference, own toy key,
and computed `__proto__` key behavior without changing the object's prototype.
An initial multi-file patch context mismatch made no changes; inspected the
worktree and retried bounded patches before running evaluators.

Evidence:

- `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
  test/toys test/core/browser/toys --coverage
  --collectCoverageFrom=src/core/browser/toys/browserToysCore.js
  --collectCoverageFrom=src/core/browser/toys/2025-03-30/cyberpunkAdventure.js
  --collectCoverageFrom=src/core/browser/toys/2026-04-19/cozyHouseAdventure.js`:
  1,286 tests in 138 suites pass; exact 100% all four metrics for three owners
  (`.tmp/toy-envelope-tests.log`).
- `TMPDIR=/home/matt/dadeto/.tmp npm run check -- --skip-tests`:
  strict 80 to 78, duplication sole failure; nine other gates pass
  (`.tmp/toy-envelope-static.log`).
- `npm run build`: passes (`.tmp/toy-envelope-build.log`).

No thresholds, ignore pragmas or exemptions added. Full zero-clone acceptance
remains outstanding.
