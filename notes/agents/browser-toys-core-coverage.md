# Browser toys core coverage

- Unexpected hurdle: wrapper tests left several core-only helper branches and fallback callbacks uncovered.
- Diagnosis: strict Babel coverage showed the exact missing statements; direct tests against `src/core/browser/toys.js` isolated those paths.
- Fix: added focused tests for row disposal, dropdown/focus behavior, row input/type handlers, renderer fallbacks, auto-submit timers, and interactive initialization.
- Evidence: the focused Jest command recorded on bead `dadeto-xmb` passes 55 suites and 297 tests at 100% statements, branches, functions, and lines.
- Next time: run the strict core-module command before relying on wrapper coverage summaries.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/browser/toys.coverage.additional.test.js test/core/browser/toys.test.js test/browser/toys --runInBand --coverage --silent --collectCoverageFrom='src/core/browser/toys.js' --coverageReporters=text-summary` — 54 suites, 293 tests passed; statements 505/505, branches 137/137, functions 136/136, lines 488/488.
