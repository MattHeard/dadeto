import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from '@jest/globals';

describe('get-author-uuid-v2 temporary Playwright coverage', () => {
  it('passes temporary function and tenant configuration into the Playwright job', async () => {
    const [
      terraform,
      functionTerraform,
      variables,
      workflow,
      fixture,
      playwrightConfig,
      testFile,
    ] = await Promise.all([
      readFile('infra/playwright.tf', 'utf8'),
      readFile('infra/functions-v2.tf', 'utf8'),
      readFile('infra/variables.tf', 'utf8'),
      readFile('.github/workflows/gcp-test.yml', 'utf8'),
      readFile('scripts/gcp-test-fixture.js', 'utf8'),
      readFile('test/e2e/cloud.config.ts', 'utf8'),
      readFile('test/e2e/get-author-uuid-v2.spec.ts', 'utf8'),
    ]);

    expect(terraform).toContain('name  = "GET_AUTHOR_UUID_V2_URL"');
    expect(terraform).toContain(
      'value = google_cloudfunctions2_function.get_author_uuid_v2.service_config[0].uri'
    );
    expect(terraform).toContain('name  = "GET_AUTHOR_UUID_V2_TENANT_ID"');
    expect(terraform).toContain(
      'value = google_identity_platform_tenant.environment.name'
    );
    expect(terraform).toContain('name  = "FIREBASE_API_KEY"');
    expect(terraform).toContain(
      'name  = "GET_AUTHOR_UUID_V2_TEST_SIGNER_SERVICE_ACCOUNT"'
    );
    expect(workflow).toContain(
      'echo "TF_VAR_database_id=$ENVIRONMENT" >> "$GITHUB_ENV"'
    );
    expect(variables).toMatch(
      /variable "get_author_uuid_v2_billing_enabled"\s*\{[^}]*default\s*=\s*false/s
    );
    const authorFunction = functionTerraform
      .split(
        'resource "google_cloudfunctions2_function" "get_author_uuid_v2"'
      )[1]
      ?.split(
        'resource "google_cloud_run_service_iam_member" "get_author_uuid_v2_public"'
      )[0];
    const creditFunction = functionTerraform
      .split(
        'resource "google_cloudfunctions2_function" "get_api_key_credit_v2"'
      )[1]
      ?.split(
        'resource "google_cloud_run_service_iam_member" "get_api_key_credit_v2_public"'
      )[0];
    expect(authorFunction).toContain(
      'var.billing_enabled || var.get_author_uuid_v2_billing_enabled'
    );
    expect(creditFunction).not.toContain('get_author_uuid_v2_billing_enabled');
    expect(workflow).toContain(
      'echo "TF_VAR_get_author_uuid_v2_billing_enabled=true" >> "$GITHUB_ENV"'
    );
    expect(workflow).toContain(
      'GET_AUTHOR_UUID_V2_BILLING_ENABLED="$TF_VAR_get_author_uuid_v2_billing_enabled"'
    );
    expect(fixture).toContain(
      "process.env.GET_AUTHOR_UUID_V2_BILLING_ENABLED === 'true'"
    );
    expect(
      fixture.indexOf('createGcpTestAuthorUuidBillingSeed(billingSeedInput)')
    ).toBeLessThan(fixture.indexOf('await seedFirestore(db)'));
    expect(playwrightConfig).toContain('**/get-author-uuid-v2.spec.ts');
    expect(testFile).toContain("mode: 'cors'");
    expect(testFile).toContain("'Idempotency-Key': 'gcp-test-author-uuid-v2'");
    expect(testFile).toContain('uuidStable:');
    expect(testFile).toContain('missingTokenStatus: missing.status');
    expect(testFile).toContain('invalidTokenStatus: invalid.status');
    expect(testFile).not.toContain('console.log');
  });

  it('gates gcp-test on Playwright and excludes manual test runs from production apply', async () => {
    const [testWorkflow, prodWorkflow] = await Promise.all([
      readFile('.github/workflows/gcp-test.yml', 'utf8'),
      readFile('.github/workflows/gcp-prod.yml', 'utf8'),
    ]);
    const playwrightStep = testWorkflow
      .split('      - name: Run Playwright job')[1]
      ?.split('\n      - name: ')[0];

    expect(playwrightStep).toContain('gcloud run jobs execute');
    expect(playwrightStep).toContain('exit "$STATUS"');
    expect(playwrightStep).not.toContain('continue-on-error');
    expect(prodWorkflow).toContain('workflows: ["gcp-test"]');
    expect(prodWorkflow).toContain(
      "github.event.workflow_run.conclusion == 'success'"
    );
    expect(prodWorkflow).toContain(
      "github.event.workflow_run.event == 'schedule'"
    );
    expect(prodWorkflow).toContain('workflow_dispatch:');
    expect(prodWorkflow).not.toContain('get-author-uuid-v2-deployment');
    expect(prodWorkflow).not.toContain('smoke deployment metadata');

    const workflows = await readdir('.github/workflows');
    expect(
      workflows.some(name =>
        name.includes('get-author-uuid-v2-production-smoke')
      )
    ).toBe(false);
  });

  it('limits custom-token signing to the disposable Playwright service account', async () => {
    const [terraform, main] = await Promise.all([
      readFile('infra/playwright.tf', 'utf8'),
      readFile('infra/main.tf', 'utf8'),
    ]);
    const signer = terraform.match(
      /resource "google_service_account_iam_member" "playwright_can_sign_test_tokens" \{[\s\S]*?\n\}/
    );

    expect(signer).not.toBeNull();
    expect(signer[0]).toContain('count = local.playwright_enabled ? 1 : 0');
    expect(signer[0]).toContain(
      'service_account_id = google_service_account.playwright[0].name'
    );
    expect(signer[0]).toContain(
      'role               = "roles/iam.serviceAccountTokenCreator"'
    );
    expect(signer[0]).toContain(
      'member             = "serviceAccount:${google_service_account.playwright[0].email}"'
    );
    expect(terraform).toContain(
      'service            = "iamcredentials.googleapis.com"'
    );
    expect(terraform).toContain('disable_on_destroy = false');
    expect(main).not.toContain('iamcredentials.googleapis.com');
  });
});
