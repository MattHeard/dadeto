# Temporary-root persistence ownership

The scalar-write/list-append strict pair repeated temporary-root replacement
and setter invocation. `writeTemporaryMemoryRoot` in the existing memoryVector
owner now performs that shared step. Reads, fallback policies, cloning and
request validation remain with their original callers. In particular append
still performs its original envelope reread; scalar still uses optional reads.

Direct regression locks replacement before setter lookup, exact envelope/root
and sibling identity, one setter call, undefined result, and missing-setter
error after root replacement.

Evidence:

- `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
  test/toys test/core/browser/toys --coverage
  --collectCoverageFrom=src/core/browser/toys/2026-05-28/memoryVector.js
  --collectCoverageFrom=src/core/browser/toys/2026-05-28/memoryScalarVectorWrite.js
  --collectCoverageFrom=src/core/browser/toys/2026-08-18/memoryObjectListAppend.js`:
  1,278 tests in 138 suites pass; exact 100% all four metrics for three owners
  (`.tmp/temporary-root-tests.log`).
- `TMPDIR=/home/matt/dadeto/.tmp npm run check -- --skip-tests`:
  strict clones 87 to 86; other nine gates pass, duplication sole failure
  (`.tmp/temporary-root-static.log`).
- `npm run build`: passes (`.tmp/temporary-root-build.log`).

Do not consolidate reader policies just because setter invocation is shared.
No threshold or ignore policy changed. Goal remains open until zero clones
and terminal full aggregate acceptance.
