# Optional callable environment lookup

The strict browserToysCore/scalar-write pair duplicated lookup and callable
recognition. `getOptionalEnvHelper` now owns that policy in browserToysCore.
Required lookup delegates to it, retaining its existing missing-helper error;
scalar reads retain optional-null fallback. Neither path invokes the returned
helper during lookup or catches errors thrown by the accessor.

Evidence:

- `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
  test/toys test/core/browser/toys --coverage
  --collectCoverageFrom=src/core/browser/toys/browserToysCore.js
  --collectCoverageFrom=src/core/browser/toys/2026-05-28/memoryScalarVectorWrite.js`:
  1,277 tests pass in 138 suites; exact 100% all four metrics for both owners
  (`.tmp/optional-env-tests.log`). Direct regressions check function identity,
  single keyed lookup, no invocation, non-callable entries, unchanged required
  error text, and propagation of accessor errors.
- `TMPDIR=/home/matt/dadeto/.tmp npm run check -- --skip-tests`:
  strict count 88 to 87; duplication sole failure, nine other gates pass
  (`.tmp/optional-env-static.log`, terminal exit 1).
- `npm run build`: passes (`.tmp/optional-env-build.log`).

This is a verified reduction, not zero-clone acceptance. Keep the canonical
clone goal open; do not replace optional behavior with throwing lookup or
introduce suppression to make the aggregate appear green.
