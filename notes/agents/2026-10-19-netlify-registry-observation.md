# Netlify registry observation artifact

## Outcome

Bead `dadeto-pafp` adds a machine-readable observation of the public function
endpoint registry consumed by a production Netlify build. The observation
contains the GitHub build run ID and source commit, stable registry URL, exact
public response body and SHA-256, parsed schema/environment/function map, and
GCS generation and ETag when the response provides them. The Netlify workflow
uploads it as `function-endpoint-registry-observation` after deployment. No
credential or secret is included, and the response body is not printed to logs.

This is one evidence slice. The artifact does not yet include the Netlify deploy
ID or join itself to the successful GCP production apply; those remain the next
Section E steps. No production deployment was dispatched from this loop.

## Validation

- `DADETO_JEST_POOL_DIR=.tmp/rank4-jest-pool DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run test:impact -- --files test/scripts/netlify-function-endpoint-registry.test.js test/scripts/netlify-prod-workflow.test.js` passed (2 suites, 13 tests).
- `DADETO_JEST_POOL_DIR=.tmp/rank4-jest-pool DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates. The changed `.github/scripts` path caused the impact runner to use its all-unit fallback: 956 suites and 6,551 tests passed; this fast local check did not collect global coverage.
- Duplication reported 0 clones, audit reported 0 vulnerabilities, and `git diff --check` passed.
- Matching GitHub Full Check and its artifact are pending the pushed commit.

## Retrospective

- **Unexpected hurdle:** The first focused test attempt could not create Jest's default pool under `/tmp` because the workspace filesystem is read-only.
- **Diagnosis and fix:** Set `DADETO_JEST_POOL_DIR=.tmp/rank4-jest-pool` and reran with reviewed filesystem access; the focused suites and full fast check completed.
- **Next time:** Keep temporary test output inside the worktree in this environment. After a successful Netlify workflow, inspect this run's observation artifact, then add deployment-ID and GCP-apply association in a separate bounded slice.
