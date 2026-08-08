# Tree-visibility regeneration core coverage

- Added empty dirty-snapshot coverage and exercised the default error logger on a failed render.
- Verified with `npx jest test/core/cloud/tree-visibility/tree-visibility-regeneration-core.test.js --no-cache --watchman=false --runInBand --coverage --coverageProvider=babel --collectCoverageFrom=src/core/cloud/tree-visibility/tree-visibility-regeneration-core.js --coverageReporters=text`.
- Focused report: `src/core/cloud/tree-visibility/tree-visibility-regeneration-core.js` reached 100% statements, branches, functions, and lines.
