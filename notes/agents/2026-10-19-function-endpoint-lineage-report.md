# Function endpoint lineage report

## Hurdles

- The GCP and Netlify artifacts are produced before their workflows have a final conclusion. The Netlify artifact also records when it read the registry, not when its workflow started. Neither should be treated as authoritative workflow status or start time.

## Diagnosis and fix

- Added an offline report composer that accepts the GCP apply artifact, Netlify registry/deployment observation, and the raw GitHub Actions run JSON for each workflow. It verifies each run ID and head SHA against the artifact, requires successful conclusions, and uses the Netlify `run_started_at` timestamp for chronology.
- The composer delegates registry schema, digest, environment, GCP source, and Netlify association checks to `parseFunctionEndpointLineage`. It reports registry publication and Netlify build/deployment linkage as verified only after the validator accepts the chain; endpoint health stays `not-verified`.
- The command writes normalized evidence and logs a fixed summary line. It makes no GitHub, GCP, Netlify, or production requests.

## Usage and next-time guidance

Download `gcp-function-endpoint-registry-evidence` from the successful `gcp-prod` run and `function-endpoint-registry-observation` from the successful `netlify-prod` run. Obtain raw run JSON for both IDs, for example with `gh api repos/MattHeard/dadeto/actions/runs/<run-id> > run.json`, then run:

```sh
FUNCTION_ENDPOINT_REGISTRY_URL=https://storage.googleapis.com/irien-465710-function-endpoints/function-endpoints.json \
  node .github/scripts/compose-function-endpoint-lineage-report.js \
  gcp-evidence.json netlify-observation.json gcp-run.json netlify-run.json lineage-report.json
```

Focused regressions passed (1 suite / 16 tests); zero-warning targeted ESLint passed. `DADETO_JEST_POOL_DIR=.tmp/rank4-jest-pool DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 local gates across five impact shards: 958 suites, 6,567 tests, zero clones, and zero audit vulnerabilities. This fast local check does not establish global coverage or E2E success. The matching Full Check for this composer commit is pending after push.

No production workflow was dispatched. A validated artifact pair has not yet been produced by the new GCP capture step, so live production lineage and browser-to-function health remain unverified and require separate authorization/evidence.
