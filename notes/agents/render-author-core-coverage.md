# Render author core coverage

- Unexpected hurdle: the ordinary Jest invocation transpiles this module as CommonJS and rejects its `import.meta.url` template lookup.
- Diagnosis: the module’s ESM test path must run with `NODE_OPTIONS=--experimental-vm-modules`; under that mode the report exposed the same-page-name comparator and defensive nullish branches.
- Fix: added genuine tests for equal-page name ordering, missing author/variant values, orphaned or malformed variants, and absent moderator snapshot data.
- Next time: use the repository’s ESM Jest mode for cloud renderers that resolve adjacent HTML templates with `import.meta.url`.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/render-author --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/render-author/render-author-core.js' --coverageReporters=text-summary` — 2 suites, 14 tests passed; statements 49/49, branches 48/48, functions 10/10, lines 43/43.
