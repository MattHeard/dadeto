# Cyclomatic factors coverage

- Added AST fixtures for missing node types and undefined identifier names.
- Verified with `npx jest test/analyzers/cyclomatic-factors.test.js --watchman=false --runInBand --coverage --coverageThreshold='{"global":{"branches":0,"functions":0,"lines":0,"statements":0}}'`.
- Focused report: `src/core/build/cyclomatic-factors.js` reached 100% statements, branches, functions, and lines.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/analyzers/cyclomatic-factors.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/build/cyclomatic-factors.js' --coverageReporters=text-summary` — 1 suite, 8 tests passed; statements 136/136, branches 105/105, functions 49/49, lines 133/133.
