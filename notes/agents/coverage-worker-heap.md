# Coverage worker heap stabilization

- **Unexpected hurdle:** The serial coverage runner's fixed 512 MB V8 heap failed in `test/analyzers/cyclomatic-factors.test.js`; raising it only to 768 MB still exhausted the worker.
- **Diagnosis:** Reproduced the first shard at both caps, then confirmed it passes at 1 GB. After increasing the cap, stale endpoint fixtures and uncovered branches/statements surfaced in other shards, so a passing first shard was not sufficient evidence.
- **Fix:** Made the worker cap configurable with `DADETO_COVERAGE_WORKER_HEAP_MB` and a 1024 MB default. Updated the affected effect-boundary fixtures and covered the missing get-moderation-variant response, middleware, and request-error paths. Kept serial sharding and exact global coverage thresholds; added no skips or exclusions.
- **Evidence:** `DADETO_COVERAGE_WORKER_HEAP_MB=1024 npm run check` passed with 23 coverage batches, exact 100% lines/statements/functions/branches, and all 10 non-test gates. `npm run build` and `npm run build:cloud` passed; restore unrelated tracked generated infra files after the cloud copy step.
- **Next-time guidance:** When a coverage worker OOMs, find the smallest failing shard and test a bounded larger heap. After that succeeds, run the complete aggregation: it can reveal stale fixtures or latent uncovered paths that focused tests do not expose.
