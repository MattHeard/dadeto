# GCP registry apply evidence

## Hurdles

- The first local check could not load `google-auth-library`, although it was already declared in `package.json` and the lockfile. Installing the locked dependencies restored the missing package without changing tracked files.
- A direct Jest invocation did not enable the repository's ESM mode. Switching to `scripts/run-jest.js` exposed that malformed apply timestamps were validated after the registry request.

## Diagnosis and fix

- Reused the shared public endpoint-registry fetcher and parser to write a private CI artifact containing the successful GCP workflow run, checked-out source SHA, Terraform Apply result and completion time, function URL map, registry body digest, schema, environment, and generation/ETag when returned.
- Recorded the apply completion timestamp in the step immediately after Terraform Apply, then validated it before making the registry GET. The body is stored in the workflow artifact and never printed to logs.
- Added a default-branch gate and upload only after successful evidence capture. No production workflow was dispatched.

## Evidence and next guidance

- Focused regressions: `node scripts/run-jest.js --runInBand test/scripts/gcp-function-endpoint-registry-evidence.test.js test/scripts/gcp-prod-workflow.test.js` — 2 suites, 12 tests passed.
- Targeted ESLint and `git diff --check` passed.
- `DADETO_JEST_POOL_DIR=.tmp/rank4-jest-pool DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 local gates across five impact shards: 957 suites, 6,563 tests, zero clones, and zero audit vulnerabilities. This fast local check does not establish global coverage or E2E success; wait for the matching GitHub Full Check before closing the Bead.
- No production apply was run, so the artifact has not yet been observed in an Actions run. The next lineage slice should consume this artifact and join it to the later Netlify deployment; do not imply that this code-only validation proves production lineage or endpoint health.
