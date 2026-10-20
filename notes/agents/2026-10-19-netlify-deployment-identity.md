# Netlify deployment identity in registry evidence

## Hurdle

The public endpoint-registry observation identified the registry body consumed by the Netlify build, but it did not identify the deployment produced by that build.

## Diagnosis

The installed Netlify CLI 17 JSON output includes a deploy ID, deploy URL, and production URL ([v17.36.4 command source](https://github.com/netlify/cli/blob/v17.36.4/src/commands/deploy/deploy.ts)). Capturing that output as a file keeps its contents out of the workflow log, allowing the workflow to validate and attach only the deployment identity to the existing observation artifact.

## Fix

The production workflow captures CLI JSON, validates the deployment ID and HTTPS URLs, and adds them to the registry observation before artifact upload. Validation errors avoid echoing CLI JSON, and the helper logs only a generic completion message. Regression tests cover malformed and missing fields, non-HTTPS URLs, merge behavior, and workflow ordering. The test fixture uses computed keys for the CLI's snake_case field names so the repository camelcase lint passes without suppressions.

## Evidence

- Focused command: `DADETO_JEST_POOL_DIR=.tmp/rank4-jest-pool npm run test:impact -- --files test/scripts/netlify-deployment-evidence.test.js test/scripts/netlify-prod-workflow.test.js` — passed, 2 suites / 10 tests.
- Focused ESLint for `test/scripts/netlify-deployment-evidence.test.js` — passed.
- `npm run check` — passed all 10 gates; five impact shards passed (957 suites / 6,559 tests), zero clones, and zero audit vulnerabilities. This fast local check does not measure full coverage; GitHub Full Check remains the authoritative full-suite result.
- `git diff --check` — passed.
- No Netlify production workflow was dispatched.

## Next

After push, record the matching GitHub Full Check result and update the Rank 4 Notion spec. Joining this Netlify deployment identity to successful GCP apply evidence remains a separate slice.
