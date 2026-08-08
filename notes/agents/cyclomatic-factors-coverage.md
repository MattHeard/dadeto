# Cyclomatic factors coverage

- Added AST fixtures for missing node types and undefined identifier names.
- Verified with `npx jest test/analyzers/cyclomatic-factors.test.js --watchman=false --runInBand --coverage --coverageThreshold='{"global":{"branches":0,"functions":0,"lines":0,"statements":0}}'`.
- Focused report: `src/core/build/cyclomatic-factors.js` reached 100% statements, branches, functions, and lines.
