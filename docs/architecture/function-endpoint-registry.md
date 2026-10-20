# Production function endpoint registry

## Canonical source

The public production registry is served from:

`https://storage.googleapis.com/irien-465710-function-endpoints/function-endpoints.json`

Terraform owns the dedicated bucket, anonymous object-reader binding, and JSON object in `infra/function-endpoints.tf`. The production object is built from live Cloud Function data-source reads, so its values are deployed HTTPS URIs rather than URLs assembled from naming conventions. Only the production environment creates this bucket and object. Runtime services and Netlify receive no GCS write credentials.

The JSON contract has `schemaVersion: 1`, `environment: "prod"`, and a `functions` object. The initial required keys are `objectMinuteRentalSearch` and `getAuthorUuidV2`. The object is served as `application/json` with `Cache-Control: no-store`. It contains public routing information only; it is not a health check.

## Netlify build behavior

`.github/workflows/netlify-prod.yml` fetches the registry anonymously before `npm run build:browser`. `.github/scripts/fetch-function-endpoint-registry.js` checks the stable GCS URL, HTTP status, response headers, and the shared schema validator. It writes `DADETO_BUILD_TARGET=production` and the validated `OBJECT_MINUTE_RENTAL_SEARCH_URL` to `GITHUB_ENV`. The browser page embeds that endpoint at build time; it does not fetch the registry at runtime.

The workflow's main-branch path filters and manual dispatch use the same registry URL. The consumer does not inspect GitHub Actions run history, download endpoint artifacts, read a repository endpoint variable, or receive GCS credentials. Local and simulator builds continue to use their existing simulator endpoint and do not fetch GCS.

## Add a function

1. Add a stable logical key to the `functions` map in `infra/function-endpoints.tf`, sourcing its value from a production-only Cloud Function data source. Do not construct the HTTPS URL from a function name.
2. Add or update the logical key in `src/core/build/function-endpoint-registry.js` when it is required by consumers, then update Terraform and fetcher contract tests.
3. Keep the value public and externally consumable. Never include internal-only endpoints, credentials, tokens, tenant data, or private service URLs.
4. Validate the fresh production plan before applying. After publication, verify the unchanged anonymous HTTPS URL, JSON contract, `application/json`, and `no-store` metadata.

## Deployment lineage evidence

`src/core/build/function-endpoint-lineage.js` validates a machine-readable record that connects a successful GCP production Terraform apply and source commit to the registry object, then to a later Netlify deployment. The record includes the GCP run ID, apply result, source commit, completion time, and deployed function URLs; the stable registry URL, exact response body, GCP run/commit association, and optional GCS generation/ETag; and the Netlify build run ID, deployment ID/URL, source commit, start time, registry URL, and registry digest.

The validator reuses `parseFunctionEndpointRegistry` for the schema, environment, and HTTPS function URLs. It hashes the exact registry response body, checks those URLs against the GCP deployment evidence, requires the Netlify build to start after the apply and to report the same registry digest, and compares a generation or ETag when the build explicitly pins one. This is an offline validation contract; it does not collect workflow metadata or prove endpoint health. Production workflow collection and independent health evidence remain separate requirements.

## Troubleshooting

- **403:** check that the registry bucket's public reader binding still allows anonymous object reads.
- **404:** confirm a successful production Terraform apply created `function-endpoints.json` at the canonical URL.
- **Network error:** check public GCS reachability; the Netlify build fails before `build:browser` and deployment, with no artifact or variable fallback.
- **Invalid JSON, schema, environment, key, or HTTPS URL:** fix Terraform's registry source or schema contract; consumers intentionally reject unsupported data.
- **Missing `no-store` or JSON content type:** correct the Terraform object metadata and publish it before relying on the response.

For an explicit read-only smoke after a production apply, run `scripts/smoke-function-endpoint-registry.js` with `FUNCTION_ENDPOINT_REGISTRY_URL` set and `--execute`. It reports status, required keys, endpoint hosts, and cache policy without printing endpoint paths.
