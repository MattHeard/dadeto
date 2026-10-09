# Prod errors request effect boundary

- Unexpected hurdle: the full check first failed because Jest exhausted the 2 GB `/tmp` filesystem while writing transform cache, then exposed an uncovered environment fallback branch and the expanded cloud adapter exceeded the 50-line non-core limit.
- Diagnosis path: reran the unit coverage command with output captured; confirmed `ENOSPC` under `/tmp/jest_rs`; moved `TMPDIR` to repo-local `.tmp`; read the coverage summary to locate the only uncovered branch in `src/core/cloud/errors/run.js`; ran the non-core-thin gate after splitting response and logger adapters.
- Chosen fix: preserve the environment getter's validated/origin/runtime read sequence, route request responses and logs through permission-first cloud adapters, and split response/log functions into files under the non-core size threshold. Each request now receives a fresh `AllowEffects` token at the HTTP boundary.
- Evidence: focused Jest 3 suites / 32 tests passed; `npm run build:cloud` passed; `npm run check` passed all 10 gates, including 100% coverage and 11/11 local E2E tests; duplication reported 0 clones.
- Next-time guidance: use repo-local `TMPDIR` for large coverage runs in this environment; the default `/tmp` mount is only 2 GB. Keep cloud adapters split by effect family when they approach the non-core 50-line limit.
- Open question: production alert root cause still needs the matched Cloud Logging entry; this environment has no readable GCP credentials and no alert payload was available in the workspace search.
