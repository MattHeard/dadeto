# Tree-visibility runner coverage

- Exercised the default `consoleError` parameter path by omitting the optional dependency.
- Verified with `npx jest test/core/cloud/tree-visibility/run.test.js --no-cache --watchman=false --runInBand --coverage --coverageProvider=babel --collectCoverageFrom=src/core/cloud/tree-visibility/run.js --coverageReporters=text`.
- Focused report: `src/core/cloud/tree-visibility/run.js` reached 100% statements, branches, functions, and lines.
