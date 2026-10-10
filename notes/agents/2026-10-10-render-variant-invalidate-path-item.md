# Render variant per-path invalidation refactor

- **Unexpected hurdle:** The first extracted dispatch helper triggered `repo/tautological-wrapper` because it only forwarded its four inputs to `sendEffectFetch`.
- **Diagnosis:** The useful responsibilities were request construction and response/error handling; a forwarding-only network wrapper added no boundary value.
- **Chosen fix:** Extracted the POST options into `buildInvalidateRequest`, kept per-path response/rejection reporting in `reportPathInvalidation`, and inlined `sendEffectFetch` at the existing permission boundary. The actual fetch call still receives `AllowEffects` as its first argument.
- **Next-time guidance:** Run both the parameter-bag detector and repository wrapper lint after extracting functions; a mechanically small helper should be inlined when it adds no behavior. Fresh no-cache scan reduced `render-variant-core.js` from 9 to 8 findings. Next is `buildRenderVariantOptions`.
- **Evidence:** Focused Jest passed (1 suite, 106 tests); scoped ESLint with `--max-warnings=0`, `npm run tsdoc:check`, and `git diff --check` passed. Full `npm run check` passed all 10 gates, 100% coverage, 11/11 local E2E, 0 clones, and 0 vulnerabilities. `npm run build:cloud` passed. Logs: `.tmp/npm-check-render-variant-invalidate-path-item.log` and `.tmp/build-cloud-render-variant-invalidate-path-item.log`.
