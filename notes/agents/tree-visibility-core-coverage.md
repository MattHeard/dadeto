# Tree-visibility core coverage

- Added propagation tests covering parent traversal, threshold dirty marking, missing snapshots, and empty snapshot data.
- Added default visibility coverage for omitted inputs.
- Verified with `npx jest test/core/cloud/tree-visibility/tree-visibility-core.test.js --no-cache --watchman=false --runInBand --coverage --coverageProvider=babel --collectCoverageFrom=src/core/cloud/tree-visibility/tree-visibility-core.js --coverageReporters=text`.
- Focused report: `src/core/cloud/tree-visibility/tree-visibility-core.js` reached 100% statements, branches, functions, and lines.
