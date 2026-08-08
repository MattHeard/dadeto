# Browser toys core coverage

- Unexpected hurdle: wrapper tests left several core-only helper branches and fallback callbacks uncovered.
- Diagnosis: strict Babel coverage showed the exact missing statements; direct tests against `src/core/browser/toys.js` isolated those paths.
- Fix: added focused tests for row disposal, dropdown/focus behavior, row input/type handlers, renderer fallbacks, auto-submit timers, and interactive initialization.
- Evidence: the focused Jest command recorded on bead `dadeto-xmb` passes 55 suites and 297 tests at 100% statements, branches, functions, and lines.
- Next time: run the strict core-module command before relying on wrapper coverage summaries.
