# Production smoke automation

- Unexpected hurdle: Production Identity Platform disables password signup and is tenant-scoped; the existing gcp-prod credential is a broad deployment credential and should not be reused by smoke CI.
- Diagnosis: The existing smoke script already verifies preflight, authenticated UUID stability, missing-token 401, and invalid-token 401. gcp-prod is a workflow_run child of gcp-test, so a second workflow_run job can run only after the matching deployment succeeds and fetch metadata from that exact run.
- Fix: Add a post-deploy workflow that exchanges a runtime custom token for an ephemeral Firebase tenant ID token. GitHub OIDC is scoped to a dedicated runner identity; that identity can sign only as a dedicated signer with no project roles. Publish endpoint and Firebase web config as safe, short-retention deployment metadata, and reject metadata from a different gcp-prod/gcp-test chain.
- Persistent effect: The fixed non-human tenant identity is retained. Its first successful request can create one authors/{uid} record; later runs check UUID stability.
- Next-time guidance: Configure the documented GitHub Actions variables and narrow Workload Identity Federation bindings, then wait for the next successful gcp-test → gcp-prod chain before recording the smoke as passed. No local or personal Firebase session is needed.

## One-time CI identity setup

The smoke workflow intentionally does not use the static Google credential
that deploys production. Create two service accounts in the project named by
the existing GOOGLE_PROJECT GitHub secret:

- dadeto-auth-smoke-runner: no project roles; GitHub OIDC impersonates it.
- dadeto-auth-smoke-signer: no project roles; the runner has only the
  iam.serviceAccounts.signBlob permission on this account to create custom
  Firebase tokens for the fixed test UID.

From an authenticated administrative shell, replace the project ID below:

```bash
PROJECT_ID="<the value configured as the GOOGLE_PROJECT GitHub secret>"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
POOL_ID="github-actions"
PROVIDER_ID="dadeto-get-author-uuid-v2-smoke"
RUNNER_NAME="dadeto-auth-smoke-runner"
SIGNER_NAME="dadeto-auth-smoke-signer"
RUNNER_EMAIL="${RUNNER_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SIGNER_EMAIL="${SIGNER_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud services enable iamcredentials.googleapis.com identitytoolkit.googleapis.com \
  --project="$PROJECT_ID"
gcloud iam service-accounts create "$RUNNER_NAME" \
  --project="$PROJECT_ID" \
  --display-name="Dadeto production auth smoke runner"
gcloud iam service-accounts create "$SIGNER_NAME" \
  --project="$PROJECT_ID" \
  --display-name="Dadeto production auth smoke token signer"
gcloud iam roles create dadetoAuthSmokeTokenSigner \
  --project="$PROJECT_ID" \
  --title="Dadeto auth smoke token signer" \
  --description="Only sign Firebase custom tokens for the dedicated smoke identity" \
  --permissions=iam.serviceAccounts.signBlob \
  --stage=GA
gcloud iam workload-identity-pools create "$POOL_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" \
  --display-name="Dadeto production auth smoke" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.workflow_ref=assertion.workflow_ref" \
  --attribute-condition="assertion.repository == 'MattHeard/dadeto' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == 'MattHeard/dadeto/.github/workflows/get-author-uuid-v2-production-smoke.yml@refs/heads/main'"

GITHUB_PRINCIPAL="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/MattHeard/dadeto"
gcloud iam service-accounts add-iam-policy-binding "$RUNNER_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="$GITHUB_PRINCIPAL"
gcloud iam service-accounts add-iam-policy-binding "$SIGNER_EMAIL" \
  --project="$PROJECT_ID" \
  --role="projects/$PROJECT_ID/roles/dadetoAuthSmokeTokenSigner" \
  --member="serviceAccount:$RUNNER_EMAIL"
```

Then add these three repository Actions variables in repository settings:

| Variable | Value |
| --- | --- |
| GET_AUTHOR_UUID_SMOKE_WIF_PROVIDER | projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID} |
| GET_AUTHOR_UUID_SMOKE_RUNNER_SERVICE_ACCOUNT | ${RUNNER_EMAIL} |
| GET_AUTHOR_UUID_SMOKE_SIGNER_SERVICE_ACCOUNT | ${SIGNER_EMAIL} |

No Firebase email/password, personal session, service-account key, or stored
Firebase ID token is needed. The public API key, tenant ID, endpoint, and source
run IDs come from a short-retention artifact created only after the matching
production apply succeeds.
