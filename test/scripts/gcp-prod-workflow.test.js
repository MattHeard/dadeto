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
});
