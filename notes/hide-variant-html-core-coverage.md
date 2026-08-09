# Hide-variant HTML core coverage

- Target: `src/core/cloud/hide-variant-html/hide-variant-html-core.js`
- Evidence: `npx jest test/core/cloud/hide-variant-html-core.branch.test.js test/core/cloud/hide-variant-html/index.test.js test/core/cloud/hide-variant-html/removeVariantHtml.test.js test/core/cloud/hide-variant-html/normalizeRemoveVariantLoadResult.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/hide-variant-html/hide-variant-html-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 4 suites and 45 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
