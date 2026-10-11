# Errors endpoint effect audit

- **Unexpected hurdle:** The entrypoint delegates nearly all behavior, so a shallow scan alone could miss that it has two distinct fetch dependencies.
- **Diagnosis:** Metadata token retrieval uses `fetchFn`; forwarding reports to Error Reporting uses `effectFetchFn`. Both dependency contracts require `AllowEffects`, and both core calls bind a fresh permission before invoking them.
- **Fix:** No source change was needed. Middleware/route registration, HTTP responses, and logging are also isolated in permission-first cloud adapters; the public handler is composed through invocation boundaries.
- **Evidence:** Focused run, core, and adapter tests passed (3 suites, 32 tests). Source inspection confirmed the only fetch references in the entrypoint are the two permission-taking wrappers.
- **Next loop:** Continue in lexicographic index order at `src/cloud/generate-stats/index.js`.
