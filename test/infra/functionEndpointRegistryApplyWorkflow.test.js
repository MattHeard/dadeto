import { readFile } from 'node:fs/promises';

describe('function endpoint registry scoped apply workflow', () => {
  let workflow;

  beforeAll(async () => {
    workflow = await readFile(
      '.github/workflows/function-endpoint-registry-apply.yml',
      'utf8'
    );
  });

  it('requires a manual main-branch dispatch and explicit opt-in', () => {
    expect(workflow).toContain('on:\n  workflow_dispatch:');
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).toContain('confirm_production_apply:');
    expect(workflow).toContain('type: boolean');
    expect(workflow).toContain('default: false');
    expect(workflow).toContain('CONFIRM_PRODUCTION_APPLY');
    expect(workflow).toContain('cancel-in-progress: false');
  });

  it('targets only the three production registry resources', () => {
    const targetArgs = [...workflow.matchAll(/-target=([^\s\\]+)/g)]
      .map(([, target]) => target)
      .sort();

    expect(targetArgs).toEqual([
      'google_storage_bucket.function_endpoint_registry',
      'google_storage_bucket_iam_member.function_endpoint_registry_public_reader',
      'google_storage_bucket_object.function_endpoint_registry',
    ]);
    expect(workflow).toContain(
      'The production plan differs from the reviewed registry creates'
    );
    expect(workflow).toContain('terraform show -json');
    expect(workflow).toContain(
      '[{"actions":["create"],"address":"google_storage_bucket.function_endpoint_registry[0]"},{"actions":["create"],"address":"google_storage_bucket_iam_member.function_endpoint_registry_public_reader[0]"},{"actions":["create"],"address":"google_storage_bucket_object.function_endpoint_registry[0]"}]'
    );
  });

  it('applies only the checked saved plan and avoids the broad production workflow', () => {
    expect(workflow).toContain(
      'terraform apply -lock-timeout=5m -input=false -auto-approve "$RUNNER_TEMP/function-endpoint-registry.tfplan"'
    );
    expect(workflow).not.toContain('gcp-prod.yml');
    expect(workflow).not.toContain('terraform apply -auto-approve');
  });
});
