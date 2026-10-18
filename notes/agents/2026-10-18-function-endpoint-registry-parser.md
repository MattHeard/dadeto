# Function endpoint registry parser extraction

- Unexpected hurdle: the first type-check caught the inferred empty object used to collect validated function URLs. The initial test path under `test/core/build/` was also ignored by the repository's broad `build/` ignore rule.
- Diagnosis: `tsdoc:check` needed an explicit `Record<string, string>` type; the test belongs directly under `test/core/` so it remains tracked.
- Fix: moved the parser into pure `src/core/build/function-endpoint-registry.js`, reused it from the production-registry smoke runner, placed tests at `test/core/functionEndpointRegistry.test.js`, and annotated the URL map.
- Evidence: `npm run lint` passed; focused Jest passed 2 suites / 33 tests; full `npm run check` passed with 10/10 static gates, all unit shards, 11/11 local E2E tests, 100% line/statement/function/branch coverage with zero skipped, and 0 clones. The initial full check exposed the type error; the final run passed after the annotation.
- Next-time guidance: check `.gitignore` before choosing a test subdirectory, and run `npm run tsdoc:check` early when adding JSDoc-typed JavaScript. Continue the registry spec with build-time retrieval and validation; keep the Netlify consumer switch behind production publication and anonymous HTTPS-read evidence.
