import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('scoped production plan workflow', () => {
  it('runs only by manual dispatch and never applies Terraform', async () => {
    const workflow = await readFile(
      '.github/workflows/get-author-uuid-v2-plan.yml',
      'utf8'
    );

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).not.toContain('startsWith(github.ref');
    expect(workflow).toContain('plan_scope:');
    expect(workflow).toContain('default: get-author-uuid-v2');
    expect(workflow).toContain('- function-endpoint-registry');
    expect(workflow).toContain('- google-auth-compat');
    expect(workflow).not.toContain('workflow_run:');
    expect(workflow).not.toContain('gcp-test');
    expect(workflow).toContain('terraform plan');
    expect(workflow).not.toContain('terraform apply');
    expect(workflow).toContain('> "$RUNNER_TEMP/terraform-plan.log" 2>&1');
    expect(workflow).toContain('npm run build:dendritestories-co-nz');
  });

  it('keeps the Rank 1 function deployment targets isolated', async () => {
    const workflow = await readFile(
      '.github/workflows/get-author-uuid-v2-plan.yml',
      'utf8'
    );
    const scope = workflow.match(
      /get-author-uuid-v2\)\s+targets=\(([\s\S]*?)\n\s+\)\n\s+;;/
    );
    const targets = [...scope[1].matchAll(/"-target=([^"]+)"/g)]
      .map(([, target]) => target)
      .sort();

    expect(targets).toEqual([
      'google_cloud_run_service_iam_member.get_author_uuid_v2_public',
      'google_cloudfunctions2_function.get_author_uuid_v2',
      'google_storage_bucket_object.dendrite_static_config',
    ]);
    expect(scope[1]).not.toContain('function_endpoint_registry');
  });

  it('keeps the Rank 2 registry resources isolated in a separate plan scope', async () => {
    const workflow = await readFile(
      '.github/workflows/get-author-uuid-v2-plan.yml',
      'utf8'
    );
    const scope = workflow.match(
      /function-endpoint-registry\)\s+targets=\(([\s\S]*?)\n\s+\)\n\s+;;/
    );
    const targets = [...scope[1].matchAll(/"-target=([^"]+)"/g)]
      .map(([, target]) => target)
      .sort();

    expect(targets).toEqual([
      'google_storage_bucket.function_endpoint_registry',
      'google_storage_bucket_iam_member.function_endpoint_registry_public_reader',
      'google_storage_bucket_object.function_endpoint_registry',
    ]);
    expect(scope[1]).not.toContain('get_author_uuid_v2');
    expect(scope[1]).not.toContain('dendrite_static_config');
  });

  it('limits the Rank 3 compatibility plan to the three Dendrite asset collections', async () => {
    const workflow = await readFile(
      '.github/workflows/get-author-uuid-v2-plan.yml',
      'utf8'
    );
    const scope = workflow.match(
      /google-auth-compat\)\s+targets=\(([\s\S]*?)\n\s+\)\n\s+;;/
    );
    const targets = [...scope[1].matchAll(/"-target=([^"]+)"/g)]
      .map(([, target]) => target)
      .sort();

    expect(targets).toEqual([
      'google_storage_bucket_object.dendrite_browser_files',
      'google_storage_bucket_object.dendrite_core_files',
      'google_storage_bucket_object.dendrite_static_files',
    ]);
    expect(scope[1]).not.toContain('function_endpoint_registry');
    expect(scope[1]).not.toContain('get_author_uuid_v2');
  });

  it('summarizes only resource addresses and actions', async () => {
    const workflow = await readFile(
      '.github/workflows/get-author-uuid-v2-plan.yml',
      'utf8'
    );

    expect(workflow).toContain('terraform show -json');
    expect(workflow).toContain('"## \\($plan_scope) production plan');
    expect(workflow).toContain('.resource_changes[]?');
    expect(workflow).toContain('.change.actions');
    expect(workflow).toContain('tee -a "$GITHUB_STEP_SUMMARY"');
    expect(workflow).not.toContain('terraform show -no-color');
  });
});
