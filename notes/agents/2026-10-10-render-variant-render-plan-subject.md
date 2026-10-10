# Render variant render-plan subject

- **Unexpected hurdle:** TSDoc found that the metadata lookup capability type already existed for `gatherMetadata`; the first pass introduced a duplicate typedef.
- **Diagnosis:** `buildRenderPlan` unpacked seven render-subject and metadata lookup fields in one parameter bag, then reconstructed the same lookup group for `gatherMetadata`.
- **Chosen fix:** Pass the page and variant subject separately from the existing `RenderMetadataLookups` capability. Preserve page validation, sequential metadata lookups, null returns, and render output construction. Strengthened the successful render test to assert story title and body text survive.
- **Next-time guidance:** Keep following the fresh scan; `persistRenderPlan` is now the sole remaining arity finding in this file and combines artifact persistence with invalidation orchestration.
- **Evidence:** Focused Jest passed (1 suite, 107 tests). Fresh no-cache scan reduced `render-variant-core.js` from 2 findings to 1 with no new findings. Scoped ESLint `--max-warnings=0`, `npm run tsdoc:check`, and `git diff --check` passed. `npm run check` passed all 10 gates, including 100% coverage, 11/11 local E2E, 0 clones, and 0 vulnerabilities. `npm run build:cloud` passed. Logs: `.tmp/npm-check-render-variant-build-render-plan.log` and `.tmp/build-cloud-render-variant-build-render-plan.log`.
