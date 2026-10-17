import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('get-author-uuid-v2 scoped production plan workflow', () => {
  it('runs only by manual dispatch and never applies Terraform', async () => {
    const workflow = await readFile(
      '.github/workflows/get-author-uuid-v2-plan.yml',
      'utf8'
    );

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).not.toContain('workflow_run:');
    expect(workflow).not.toContain('gcp-test');
    expect(workflow).toContain('terraform plan');
    expect(workflow).not.toContain('terraform apply');
    expect(workflow).toContain('> "$RUNNER_TEMP/terraform-plan.log" 2>&1');
  });

  it('targets only the function, approved invoker binding, and browser URL config', async () => {
    const workflow = await readFile(
      '.github/workflows/get-author-uuid-v2-plan.yml',
      'utf8'
    );
    const targets = [...workflow.matchAll(/-target=([^\\\s]+)/g)]
      .map(([, target]) => target)
      .sort();

    expect(targets).toEqual([
      'google_cloud_run_service_iam_member.get_author_uuid_v2_public',
      'google_cloudfunctions2_function.get_author_uuid_v2',
      'google_storage_bucket_object.dendrite_static_config',
    ]);
    expect(workflow).not.toContain('function_endpoint_registry');
  });

  it('summarizes only resource addresses and actions', async () => {
    const workflow = await readFile(
      '.github/workflows/get-author-uuid-v2-plan.yml',
      'utf8'
    );

    expect(workflow).toContain('terraform show -json');
    expect(workflow).toContain('.resource_changes[]?');
    expect(workflow).toContain('.change.actions');
    expect(workflow).not.toContain('terraform show -no-color');
  });
});
