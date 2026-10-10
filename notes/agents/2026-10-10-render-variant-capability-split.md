# Render variant capability split

- **Unexpected hurdle:** No test or type regressions appeared while changing the internal renderer contract.
- **Diagnosis:** `buildRenderVariantOptions` normalized output-writing and cache-invalidation dependencies into one flat bag; the handler then unpacked that mixed boundary.
- **Chosen fix:** Built distinct `rendering` and `invalidation` capabilities, including a permission-aware operations group and a separate CDN target. The internal handler now consumes both groups directly; the public `createRenderVariant(dependencies)` signature is unchanged, and no `AllowEffects` token is created or retained at factory time.
- **Next-time guidance:** Keep cloud capabilities grouped by the effects they perform, and pass the boundary itself instead of a pre-minted token. The per-file scan dropped from 8 findings to 6; next is `validateDependencies`.
- **Evidence:** Focused render-variant suite passed (106 tests); scoped ESLint with `--max-warnings=0`, `npm run tsdoc:check`, and `git diff --check` passed. Full `npm run check` passed all 10 gates, 100% coverage, 11/11 local E2E, 0 clones, and 0 vulnerabilities. `npm run build:cloud` passed. Logs: `.tmp/npm-check-render-variant-build-options.log` and `.tmp/build-cloud-render-variant-build-options.log`.
