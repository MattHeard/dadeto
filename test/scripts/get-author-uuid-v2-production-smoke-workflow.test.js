import { readFile } from 'node:fs/promises';

import { describe, expect, it } from '@jest/globals';

describe('get-author-uuid-v2 production smoke workflow', () => {
  it('runs only after a successful gcp-prod run caused by the gcp-test chain', async () => {
    const workflow = await readFile(
      '.github/workflows/get-author-uuid-v2-production-smoke.yml',
      'utf8'
    );

    expect(workflow).toContain('workflows: ["gcp-prod"]');
    expect(workflow).toContain('types: [completed]');
    expect(workflow).toContain(
      "github.event.workflow_run.conclusion == 'success'"
    );
    expect(workflow).toContain(
      "github.event.workflow_run.event == 'workflow_run'"
    );
    expect(workflow).toContain(
      'github.event.workflow_run.head_branch == github.event.repository.default_branch'
    );
    expect(workflow).not.toContain('gcp-test.yml');
    expect(workflow).not.toContain('workflow_dispatch');
  });

  it('downloads metadata from the exact triggering deployment run', async () => {
    const workflow = await readFile(
      '.github/workflows/get-author-uuid-v2-production-smoke.yml',
      'utf8'
    );

    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('run-id: ${{ github.event.workflow_run.id }}');
    expect(workflow).toContain('name: get-author-uuid-v2-deployment');
    expect(workflow).toContain(
      'GET_AUTHOR_UUID_SMOKE_EXPECTED_GCP_PROD_RUN_ID'
    );
  });

  it('uses GitHub OIDC and a scoped signer instead of stored user or deployment credentials', async () => {
    const workflow = await readFile(
      '.github/workflows/get-author-uuid-v2-production-smoke.yml',
      'utf8'
    );

    expect(workflow).toContain('id-token: write');
    expect(workflow).toContain('workload_identity_provider:');
    expect(workflow).toContain('GET_AUTHOR_UUID_SMOKE_RUNNER_SERVICE_ACCOUNT');
    expect(workflow).toContain('GET_AUTHOR_UUID_SMOKE_SIGNER_SERVICE_ACCOUNT');
    expect(workflow).toContain(
      'Verify smoke-only Workload Identity Federation settings'
    );
    expect(workflow).toContain(
      'one-time setup in notes/agents/2026-10-18-get-author-uuid-v2-production-smoke.md'
    );
    expect(workflow).not.toContain('GOOGLE_CREDENTIALS');
    expect(workflow).not.toContain('GET_AUTHOR_UUID_SMOKE_TOKEN');
    expect(workflow).toContain(
      'node scripts/get-author-uuid-v2-production-smoke.js --execute'
    );
  });

  it('publishes only safe deployment metadata after Terraform apply succeeds', async () => {
    const workflow = await readFile('.github/workflows/gcp-prod.yml', 'utf8');
    const applyIndex = workflow.indexOf('name: Terraform Apply');
    const metadataIndex = workflow.indexOf(
      'name: Prepare get-author-uuid-v2 smoke deployment metadata'
    );
    const artifactIndex = workflow.indexOf(
      'name: Upload get-author-uuid-v2 smoke deployment metadata'
    );

    expect(applyIndex).toBeGreaterThanOrEqual(0);
    expect(metadataIndex).toBeGreaterThan(applyIndex);
    expect(artifactIndex).toBeGreaterThan(metadataIndex);
    expect(workflow).toContain('terraform output -raw get_author_uuid_v2_url');
    expect(workflow).toContain(
      'terraform output -json firebase_web_app_config'
    );
    expect(workflow).toContain('SOURCE_GCP_TEST_RUN_ID');
    expect(workflow).toContain(
      'DEPLOYMENT_ORIGIN: https://www.dendritestories.co.nz'
    );
    expect(workflow).not.toContain('GET_AUTHOR_UUID_SMOKE_TOKEN');
    expect(workflow).not.toContain('authors/');
  });
});
