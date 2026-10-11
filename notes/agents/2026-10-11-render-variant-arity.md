# Render variant arity cleanup (2026-10-11)

- Unexpected hurdle: the full check ran for several minutes and its process session expired before polling, so success had to be verified from the terminal check log and generated coverage summary.
- Diagnosis: the terminal log contains a final `npm run check` summary of 10 gates passed, 0 failed; the coverage summary reports 100% lines, functions, statements, and branches.
- Fix: render-variant author lookup and reverse-link persistence now consume cohesive named input records through direct field access, removing transport-only destructuring while retaining behavior.
- Evidence: focused Jest (2 suites, 115 tests), fresh per-file arity scan (0 findings), scoped ESLint, TSDoc, `git diff --check`, and full `npm run check` all passed. Full-check log: `.tmp/npm-check-parameter-bag-render-variant.log`.
- Refreshed scope: a no-cache scan of all 95 `src/core/cloud` JavaScript files reports 20 findings across 18 files (`.tmp/parameter-bag-cloud-current.json`). The largest remaining cloud target is `src/core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js` with 3. This is a cloud-only count, not a whole-repository count; the old 103-finding report still contains the removed render-variant findings.
- Next-time guidance: refresh the full inventory in smaller source-directory batches; do not rely on projected totals after a long-running check or a stale report.
