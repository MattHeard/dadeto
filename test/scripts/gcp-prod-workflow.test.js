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

  it('keeps production deployment chained to a successful gcp-test without smoke metadata', async () => {
    const source = readFileSync('.github/workflows/gcp-prod.yml', 'utf8');

    expect(source).toContain('workflows: ["gcp-test"]');
    expect(source).toContain(
      "github.event.workflow_run.conclusion == 'success'"
    );
    expect(source).not.toContain('get-author-uuid-v2-deployment');
    expect(source).not.toContain('smoke deployment metadata');
    expect(source).not.toContain('id-token: write');
  });
});
