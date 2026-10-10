# Render variant invalidation execution refactor

- **Unexpected hurdle:** The first scoped lint run found a duplicate `@param paths` entry after the function signature changed.
- **Diagnosis:** The existing JSDoc parameter line was retained while the replacement documentation added the same parameter again.
- **Chosen fix:** Removed the duplicate JSDoc entry. `executeInvalidation` now acquires the metadata token through a dedicated helper, creates one boundary-wrapped invalidator, then runs it for each path with `Promise.all`. The metadata fetch still gets a fresh boundary permission; each purge also gets its own fresh permission.
- **Next-time guidance:** Keep token acquisition separate from per-path work so the single token fetch and purge concurrency stay visible. A fresh no-cache scan reduced `render-variant-core.js` from 10 to 9 findings; next inspect `invalidatePathItem` and its request/logging responsibilities.
- **Evidence:** Focused Jest passed (1 suite, 106 tests). Scoped ESLint with `--max-warnings=0`, `npm run tsdoc:check`, and `git diff --check` passed. Full `npm run check` passed all 10 gates, 100% coverage, 11/11 local E2E, 0 clones, and 0 vulnerabilities. `npm run build:cloud` passed. Logs: `.tmp/npm-check-render-variant-execute-invalidation.log` and `.tmp/build-cloud-render-variant-execute-invalidation.log`.
