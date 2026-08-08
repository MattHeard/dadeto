# Mark-variant-dirty runner coverage

- Added the author-dirty request path to the runner test, including the two dirty-state updates.
- Verified with `npx jest test/core/cloud/mark-variant-dirty/run.test.js --watchman=false --runInBand --coverage --collectCoverageFrom=src/core/cloud/mark-variant-dirty/run.js --coverageReporters=text`.
- Focused report: `src/core/cloud/mark-variant-dirty/run.js` reached 100% statements, branches, functions, and lines.
