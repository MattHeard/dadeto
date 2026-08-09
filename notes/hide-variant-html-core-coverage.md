# Hide variant HTML core coverage

- Target: `src/core/cloud/hide-variant-html/hide-variant-html-core.js`
- Evidence: `npx jest test/core/cloud/hide-variant-html/index.test.js test/core/cloud/hide-variant-html/normalizeRemoveVariantLoadResult.test.js test/core/cloud/hide-variant-html/removeVariantHtml.test.js --runInBand --coverage --collectCoverageFrom=src/core/cloud/hide-variant-html/hide-variant-html-core.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 3 suites and 38 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
