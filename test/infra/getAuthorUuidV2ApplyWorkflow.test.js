import { readFile } from 'node:fs/promises';

describe('get-author-uuid-v2 scoped apply workflow', () => {
  let workflow;

  beforeAll(async () => {
    workflow = await readFile(
      '.github/workflows/get-author-uuid-v2-apply.yml',
      'utf8'
    );
  });

  it('is manually dispatched on main and requires an explicit confirmation', () => {
    expect(workflow).toContain('on:\n  workflow_dispatch:');
    expect(workflow).toContain('confirm_production_apply:');
    expect(workflow).toContain('type: boolean');
    expect(workflow).toContain('default: false');
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).toContain('CONFIRM_PRODUCTION_APPLY');
  });

  it('targets only the function, invoker, and configured endpoint objects', () => {
    expect(workflow).toContain(
      '-target=google_cloudfunctions2_function.get_author_uuid_v2'
    );
    expect(workflow).toContain(
      '-target=google_cloud_run_service_iam_member.get_author_uuid_v2_public'
    );
    expect(workflow).toContain(
      '-target=google_storage_bucket_object.dendrite_static_config'
    );
    expect(workflow).toContain(
      'google_storage_bucket_object.get_author_uuid_v2_zip'
    );
    expect(workflow).toContain(
      'The production plan differs from the reviewed Rank 1 resource actions'
    );
    expect(workflow).toContain('terraform show -json');
  });

  it('requires the exact reviewed actions after the partial failed apply', () => {
    const expected = workflow.match(/expected='([^']+)'/);

    expect(expected).not.toBeNull();
    expect(JSON.parse(expected[1])).toEqual([
      {
        actions: ['create'],
        address:
          'google_cloud_run_service_iam_member.get_author_uuid_v2_public',
      },
      {
        actions: ['delete', 'create'],
        address: 'google_cloudfunctions2_function.get_author_uuid_v2',
      },
      {
        actions: ['update'],
        address: 'google_storage_bucket_object.dendrite_static_config',
      },
      {
        actions: ['delete', 'create'],
        address: 'google_storage_bucket_object.get_author_uuid_v2_zip',
      },
    ]);
  });

  it('applies only the checked saved plan and avoids the broad production workflow', () => {
    expect(workflow).toContain(
      'terraform apply -lock-timeout=5m -input=false -auto-approve "$RUNNER_TEMP/get-author-uuid-v2.tfplan"'
    );
    expect(workflow).not.toContain('gcp-prod.yml');
    expect(workflow).not.toContain(
      'terraform apply -lock-timeout=5m -auto-approve tfplan'
    );
  });
});
