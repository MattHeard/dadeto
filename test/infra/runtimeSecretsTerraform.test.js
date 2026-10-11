import { readFile } from 'node:fs/promises';

describe('runtime secret Terraform contract', () => {
  let main;
  let variables;
  let prodWorkflow;
  let testWorkflow;
  let syncWorkflow;
  let playwright;

  beforeAll(async () => {
    [main, variables, prodWorkflow, testWorkflow, syncWorkflow, playwright] =
      await Promise.all([
        readFile('infra/main.tf', 'utf8'),
        readFile('infra/variables.tf', 'utf8'),
        readFile('.github/workflows/gcp-prod.yml', 'utf8'),
        readFile('.github/workflows/gcp-test.yml', 'utf8'),
        readFile('.github/workflows/sync-runtime-secret.yml', 'utf8'),
        readFile('infra/playwright.tf', 'utf8'),
      ]);
  });

  test('provisions Secret Manager and explicit-version runtime bindings', () => {
    expect(main).toContain('secretmanager.googleapis.com');
    expect(main).toContain('google_secret_manager_secret.runtime');
    expect(main).toContain(
      'resource "google_secret_manager_secret_iam_member" "runtime_accessor"'
    );
    expect(main).toContain('secret_environment_variables');
    expect(variables).toContain('stripe_webhook_secret_version');
    expect(variables).toContain('openai_api_key_version');
  });

  test('application deployment does not pass OpenAI values through Terraform variables', () => {
    expect(prodWorkflow).not.toContain('TF_VAR_openai_api_key');
    expect(testWorkflow).not.toContain('TF_VAR_openai_api_key');
    expect(main).not.toContain('{ OPENAI_API_KEY = var.openai_api_key }');
  });

  test('rotation is manually triggered and sends secret input on stdin', () => {
    expect(syncWorkflow).toContain('workflow_dispatch:');
    expect(syncWorkflow).toContain('--data-file=-');
    expect(syncWorkflow).not.toContain('echo "$SECRET_VALUE"');
  });

  test('Playwright can sign webhook fixtures with only the test webhook secret', () => {
    expect(playwright).toContain(
      'google_secret_manager_secret_iam_member" "playwright_webhook_accessor'
    );
    expect(playwright).toContain(
      'secret_id = local.test_runtime_secret_names.stripe_webhook'
    );
    expect(playwright).toContain('name = "STRIPE_WEBHOOK_SECRET"');
    expect(playwright).toContain(
      'secret  = google_secret_manager_secret.runtime["stripe_webhook"].id'
    );
  });
});
