# Mark-variant-dirty core coverage

- Added author lookup success and not-found tests, author request handler outcomes, and author-id parsing coverage.
- Verified with `npx jest test/core/cloud/mark-variant-dirty/mark-variant-dirty-core.test.js --watchman=false --runInBand --coverage --collectCoverageFrom=src/core/cloud/mark-variant-dirty/mark-variant-dirty-core.js --coverageReporters=text`.
- Focused report: `src/core/cloud/mark-variant-dirty/mark-variant-dirty-core.js` reached 100% statements, branches, functions, and lines.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/mark-variant-dirty --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/mark-variant-dirty/mark-variant-dirty-core.js' --coverageReporters=text-summary` — 4 suites, 66 tests passed; statements 153/153, branches 56/56, functions 62/62, lines 150/150.
