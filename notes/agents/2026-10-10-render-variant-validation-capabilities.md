# Render variant dependency validation split

- **Unexpected hurdle:** The helper test wrapper injects default effect adapters, so it could not test missing invalidation capabilities directly.
- **Diagnosis:** Tests through the convenience wrapper masked `bindEffectBoundary` and `effectFetchFn` validation failures.
- **Chosen fix:** Split validation into output-service and invalidation-capability validators while retaining database, storage, fetch, boundary, purge-adapter, and UUID validation order. Added direct core-factory cases that prove the boundary and purge-adapter errors retain precedence over later missing dependencies.
- **Next-time guidance:** Bypass fixture wrappers when testing required dependency failures, since wrappers may supply the very dependencies under test. Fresh no-cache scan reduced `render-variant-core.js` from 6 findings to 5; next is `executeRenderWorkflow`.
- **Evidence:** Focused render-variant suite passed (107 tests); scoped ESLint with `--max-warnings=0`, `npm run tsdoc:check`, and `git diff --check` passed. Full `npm run check` passed all 10 gates, 100% coverage, 11/11 local E2E, 0 clones, and 0 vulnerabilities. `npm run build:cloud` passed. Logs: `.tmp/npm-check-render-variant-validation.log` and `.tmp/build-cloud-render-variant-validation.log`.
