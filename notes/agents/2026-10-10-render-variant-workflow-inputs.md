# Render variant workflow input decomposition

- **Unexpected hurdle:** No regressions surfaced when removing the workflow's intermediate dependency bag.
- **Diagnosis:** `executeRenderWorkflow` accepted stable database, bucket, logger, threshold, and invalidation dependencies in a destructured object in addition to snapshot and context, even though all stable values already lived in the renderer closure.
- **Chosen fix:** The workflow now accepts only the runtime snapshot and context. Render planning and persistence read stable capabilities directly from the factory closure; early return, plan-before-persist order, invalidation callback, and `null` result remain unchanged.
- **Next-time guidance:** If stable dependencies are already in a factory closure, pass only per-invocation values to the workflow helper. Fresh no-cache scan remains at 4 findings; next is `gatherMetadata`.
- **Evidence:** Focused render-variant suite passed (107 tests); scoped ESLint with `--max-warnings=0`, `npm run tsdoc:check`, and `git diff --check` passed. Full `npm run check` passed all 10 gates, 100% coverage, 11/11 local E2E, 0 clones, and 0 vulnerabilities. `npm run build:cloud` passed. Logs: `.tmp/npm-check-render-variant-workflow.log` and `.tmp/build-cloud-render-variant-workflow.log`.
