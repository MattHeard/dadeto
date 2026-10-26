# Nested Playwright config output paths

Scheduled `gcp-test` run 40267542158 at 2386998 passed the Tetracube touch-and-keyboard case (2.8s), then failed in `scripts/run-e2e.js` because the expected root `playwright-report` did not exist. Cleanup passed. Logs are retained in the workflow artifact `playwright-job-logs-t-bcb6120f` and downloaded to `/tmp/dadeto-gcp-40267542158`.

Diagnosis used installed Playwright 1.61.0 source: `resolveReporterOutputPath` resolves explicit outputFolder from configDir; the project outputDir resolver does the same. The runner selects nested `test/e2e/cloud.config.ts`, so its previous relative paths targeted `test/e2e/playwright-report` and `test/e2e/test-results`, while the uploader checked root paths.

Fix both config paths with `node:path` resolve at the existing repository-root working directory (`/app` in the container). Preserve HTML/list reporters and strict report-presence/upload gates. The new VM-based config regression evaluates actual config code with the real path resolver and an identity defineConfig stub, without loading Playwright or launching a browser. It failed before the fix (relative test-results instead of absolute root path) and passed after. Five focused config/workflow/entrypoint suites passed 23 tests. No workflow, IAM policy, production safeguard, cloud deployment or provider call changed.

Owning Bead: dadeto-en6p. The pending renewed manual cloud-run approval remains unanswered; no new run was dispatched. Local config evidence does not prove cloud artifact retention. Inspect a later successful gcp-test E2E artifact before claiming the playtest is complete.

Local evidence: focused5 suites/23tests pass; `npm run check` passes all10 gates and duplication reports0 clones. No local browser or GCP job was launched. This loop fixes the proven code path; Rank4 remains Active / Partial pending actual retained report/playtest evidence and the already-requested renewed isolated-cloud approval.
