# Local and remote check baseline

Date: 2026-10-20 UTC. Worktree and `origin/main` had the same tree, `aae592dc83d23983d713743d7cddfc1ab551bf4d`, at main commit `47ca8a9a6c7ca5a62e3bffd5c56c5799ce7b523c`.

## Measurements

- Clean-tree fast check: `time env DADETO_JEST_POOL_DIR=.tmp/jest-pool-rank2-clean DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates in 23.884 seconds. `test:impact` saw no changed paths, selected no tests, and skipped Jest. This is a clean-tree/static-gate timing, not unit-test evidence.
- Merged-diff fast check: `time env DADETO_CHECK_BASE=ec5b350c473b5da24cd8a681d14bc16a2eec37a4 DADETO_JEST_POOL_DIR=.tmp/jest-pool-rank2-delta DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates in 3m26.526s. Because `docs/toys/threefold/acceptance.md` is an unsupported changed path, impact analysis conservatively fell back to five serial all-unit shards: 968 suites and 6,763 tests passed in 183.333s. The static gates also passed, duplication found zero clones, and npm audit found zero vulnerabilities.
- Matching remote evidence: main Full Check [39394260365](https://github.com/MattHeard/dadeto/actions/runs/39394260365) passed on commit `47ca8a9a6c7ca5a62e3bffd5c56c5799ce7b523c`, whose tree hash is the same. The job took 7m54s and its `check:full` step took 6m57s; report artifact [12251422127](https://github.com/MattHeard/dadeto/actions/runs/39394260365/artifacts/12251422127).

## Interpretation and next time

This is one passing tree, not enough data to estimate predictive precision or recall. The normal clean-tree check runs no tests. With the base ref, this diff's Markdown path caused the documented conservative all-unit fallback, so the local run was not a narrow test selection. It ran without coverage and does not replace remote `check:full`, which includes the full coverage thresholds and E2E.

The impact selector reads `DADETO_CHECK_BASE`; `DADETO_CHECK_BASE_SHA` is consumed by the full-report writer and does not set the test-impact base. For future local-versus-remote measurements, record paired results on the exact same tree and classify unsupported-path fallback separately from a targeted selection. Do not change the selector based on this one observation.

Earlier setup notes for this loop: a worktree initially lacked `google-auth-library`; installing the repository dependencies resolved that environment setup issue. ESLint also flagged the THREEFOLD renderer test group for function length; splitting the group at the episode-outcome boundary resolved the warning. Neither issue reproduced in these two baseline runs.
