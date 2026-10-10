# Render variant invalidation arity refactor

- **Unexpected hurdle:** The first full `npm run check` hit a five-second timeout in the unrelated `test/core/local/documentStore.test.js` test `skips moving backwards and keeps the active index within range`.
- **Diagnosis:** Running that Jest suite alone passed all 26 tests. The full check passed on rerun, so no document-store change was warranted.
- **Chosen fix:** Split `createInvalidatePaths` inputs into a permission-aware HTTP capability, CDN target options, request UUID generator, and optional logger. The returned callback remains `(paths) => Promise<void>`, and permission binding remains at each effectful HTTP request.
- **Next-time guidance:** Reproduce isolated timeouts before changing unrelated code. A fresh no-cache parameter-bag scan reduced `render-variant-core.js` from 13 findings to 10; next inspect the remaining `executeInvalidation` finding and its effect-boundary flow.
- **Evidence:** Focused suite passed (106 tests); scoped ESLint, `npm run tsdoc:check`, and `git diff --check` passed. Full check rerun passed all 10 gates, 100% coverage, 11/11 local E2E, 0 clones, and 0 vulnerabilities. `npm run build:cloud` passed. Logs are in `.tmp/npm-check-render-variant-invalidation-arity-rerun.log` and `.tmp/build-cloud-render-variant-invalidation-arity.log`.
