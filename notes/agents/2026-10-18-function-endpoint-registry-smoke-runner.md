# Function endpoint registry smoke runner

- Unexpected hurdle: the production registry cannot be read until its three-resource Terraform apply is explicitly approved, while this workspace is intentionally unauthenticated for GCP.
- Diagnosis: Rank 2 requires a real anonymous HTTPS GET before the Netlify consumer changes. The repository has an exact scoped apply workflow, but no operator command to validate the resulting public object.
- Chosen fix: add a no-network-by-default Node verifier that requires `--execute`, accepts only the stable GCS registry URL shape, rejects redirects, validates response metadata and the versioned production schema, and prints endpoint hosts without full URL values. Mocked tests cover dry-run and failure behavior.
- Next-time guidance: after separate authorization and successful apply, run `FUNCTION_ENDPOINT_REGISTRY_URL=<stable-url> node scripts/smoke-function-endpoint-registry.js --execute` and attach its redacted result to the Rank 2 evidence. Do not switch Netlify until the verified registry exists.
