import { readFileSync } from 'node:fs';

describe('gcp-prod workflow database selection', () => {
  it('targets the named production Firestore database explicitly', () => {
    const source = readFileSync('.github/workflows/gcp-prod.yml', 'utf8');

    expect(source).toContain(
      'TF_VAR_database_id: production-restore-2026-07-01-08-59'
    );
    expect(source).toContain(
      "TF_VAR_create_default_firestore_database: 'false'"
    );
    expect(source).toContain(
      "TF_VAR_billing_enabled: ${{ vars.PROD_BILLING_ENABLED || 'false' }}"
    );
  });

  it('imports the production single-field index into Terraform state', () => {
    const source = readFileSync('.github/workflows/gcp-prod.yml', 'utf8');

    expect(source).toContain(
      'google_firestore_field.variants_tree_weights_dirty[0]'
    );
    expect(source).toContain(
      '/collectionGroups/variants/fields/targetTreeWeightsDirty'
    );
  });

  it('does not publish a duplicate endpoint artifact or request writable Actions permissions', () => {
    const source = readFileSync('.github/workflows/gcp-prod.yml', 'utf8');

    expect(source).not.toContain('object-minute-rental-search-url');
    expect(source).not.toContain('actions/upload-artifact@v4');
    expect(source).not.toContain('actions: write');
    expect(source).not.toContain(
      'gh variable set OBJECT_MINUTE_RENTAL_SEARCH_URL'
    );
  });

  it('promotes only successful scheduled gcp-test runs and keeps direct dispatch available', async () => {
    const source = readFileSync('.github/workflows/gcp-prod.yml', 'utf8');

    expect(source).toContain('workflows: ["gcp-test"]');
    expect(source).toContain(
      "github.event.workflow_run.conclusion == 'success'"
    );
    expect(source).toContain("github.event.workflow_run.event == 'schedule'");
    expect(source).toContain('workflow_dispatch:');
    expect(source).not.toContain('get-author-uuid-v2-deployment');
    expect(source).not.toContain('smoke deployment metadata');
    expect(source).not.toContain('id-token: write');
  });

  it('captures GCP registry evidence only after the default-branch apply succeeds', () => {
    const source = readFileSync('.github/workflows/gcp-prod.yml', 'utf8');
    const applyIndex = source.indexOf('id: terraform_apply');
    const completionTimeIndex = source.indexOf(
      'name: Record Terraform Apply completion time'
    );
    const captureIndex = source.indexOf(
      'name: Capture GCP production endpoint registry evidence'
    );
    const uploadIndex = source.indexOf(
      'name: Upload GCP production endpoint registry evidence'
    );

    expect(applyIndex).toBeGreaterThan(-1);
    expect(completionTimeIndex).toBeGreaterThan(applyIndex);
    expect(captureIndex).toBeGreaterThan(completionTimeIndex);
    expect(uploadIndex).toBeGreaterThan(captureIndex);
    expect(source).toContain(
      'TERRAFORM_APPLY_OUTCOME: ${{ steps.terraform_apply.outcome }}'
    );
    expect(source).toContain(
      'TERRAFORM_APPLY_COMPLETED_AT: ${{ steps.terraform_apply_completed_at.outputs.completed_at }}'
    );
    expect(source).toContain(
      'github.event.workflow_run.head_branch == github.event.repository.default_branch'
    );
    expect(source).toContain(
      'github.ref_name == github.event.repository.default_branch'
    );
    expect(source).toContain(
      'FUNCTION_ENDPOINT_REGISTRY_URL="$(terraform output -raw function_endpoint_registry_url)"'
    );
    expect(source).toContain(
      'node ../.github/scripts/write-gcp-function-endpoint-registry-evidence.js'
    );
    expect(source).toContain(
      "if: steps.registry_evidence.outcome == 'success'"
    );
    expect(source).toContain('name: gcp-function-endpoint-registry-evidence');
    expect(source).toContain('if-no-files-found: error');
    expect(source).toContain('retention-days: 90');
  });
});
