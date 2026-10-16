import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('get-author-uuid-v2 deployment configuration', () => {
  it('packages the handler and grants the approved public Cloud Run invocation role', async () => {
    const terraform = await readFile('infra/functions-v2.tf', 'utf8');
    const functionResource = terraform.match(
      /resource "google_cloudfunctions2_function" "get_author_uuid_v2" {[\s\S]*?\n}/
    );
    const invoker = terraform.match(
      /resource "google_cloud_run_service_iam_member" "get_author_uuid_v2_public" {[\s\S]*?\n}/
    );

    expect(terraform).toContain(
      'source_dir  = "${path.module}/cloud-functions/get-author-uuid-v2"'
    );
    expect(functionResource).not.toBeNull();
    expect(functionResource[0]).toContain('entry_point = "handle"');
    expect(functionResource[0]).toContain(
      'service_account_email = local.cloud_function_runtime_service_account_email'
    );
    expect(invoker).not.toBeNull();
    expect(invoker[0]).toContain('role     = "roles/run.invoker"');
    expect(invoker[0]).toContain('member   = local.all_users_member');
  });

  it('uses Terraform’s function service URI in the browser configuration', async () => {
    const [main, template] = await Promise.all([
      readFile('infra/main.tf', 'utf8'),
      readFile('infra/config.json.tftpl', 'utf8'),
    ]);

    expect(main).toMatch(
      /get_author_uuid_url\s*=\s*google_cloudfunctions2_function\.get_author_uuid_v2\.service_config\[0\]\.uri/
    );
    expect(template).toContain(
      '"getAuthorUuidUrl": ${jsonencode(get_author_uuid_url)}'
    );
  });
});
