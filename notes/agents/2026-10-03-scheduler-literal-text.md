# Scheduler literal-text recognition

Strict scheduler/ledger suffix matched scheduler's local text recognition.
The scheduler's named `toText` wrapper now delegates to `stringOrNull` and
coalesces only null. Ledger's numeric and case-insensitive policies are untouched.

During read-only preparation, `stringOr` looked suitable but its whitespace
policy was not: it rejects whitespace-only strings. Use the exact-type helper
instead. Regression covers literal whitespace, empty strings, boxed strings,
symbols and getter avoidance, retaining the wrapper's name.

Evidence:

- `TMPDIR=/home/matt/dadeto/.tmp node scripts/run-jest.js --runInBand
  test/toys/2026-06-15/conflictAwareProductScheduler.test.js --coverage
  --collectCoverageFrom=src/core/browser/toys/2026-06-15/conflictAwareProductScheduler.js`:
  11 tests pass, exact 100% all four owner metrics (`.tmp/scheduler-text-tests.log`).
- `TMPDIR=/home/matt/dadeto/.tmp npm run check -- --skip-tests`:
  strict 83 to 82, duplication sole failure; nine other gates pass
  (`.tmp/scheduler-text-static.log`).
- `npm run build`: passes (`.tmp/scheduler-text-build.log`).

Preceding full83 aggregate terminated with duplication as its sole failure
(`.tmp/clone-goal-83-full-check.log`). Global exact totals all covered:
20,090 lines, 20,913 statements, 6,976 functions, 9,943 branches.
That result predates this refactor; final zero-clone full-check acceptance is
still required. No threshold or ignore policies changed.
