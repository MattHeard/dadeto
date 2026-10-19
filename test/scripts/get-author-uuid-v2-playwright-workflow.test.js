import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from '@jest/globals';

describe('get-author-uuid-v2 temporary Playwright coverage', () => {
  it('passes temporary function and tenant configuration into the Playwright job', async () => {
    const [terraform, workflow, playwrightConfig, testFile] = await Promise.all(
      [
        readFile('infra/playwright.tf', 'utf8'),
        readFile('.github/workflows/gcp-test.yml', 'utf8'),
        readFile('test/e2e/cloud.config.ts', 'utf8'),
        readFile('test/e2e/get-author-uuid-v2.spec.ts', 'utf8'),
      ]
    );

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
    expect(playwrightConfig).toContain('**/get-author-uuid-v2.spec.ts');
    expect(testFile).toContain("mode: 'cors'");
    expect(testFile).toContain('uuidStable:');
    expect(testFile).toContain('missingTokenStatus: missing.status');
    expect(testFile).toContain('invalidTokenStatus: invalid.status');
    expect(testFile).not.toContain('console.log');
  });

  it('gates gcp-test on the Playwright result and preserves the successful gcp-prod chain', async () => {
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
