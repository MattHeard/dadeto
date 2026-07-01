import { readFileSync } from 'node:fs';

describe('gcp-prod workflow database selection', () => {
  it('targets the named production Firestore database explicitly', () => {
    const source = readFileSync('.github/workflows/gcp-prod.yml', 'utf8');

    expect(source).toContain('TF_VAR_database_id: production');
    expect(source).toContain(
      "TF_VAR_create_default_firestore_database: 'false'"
    );
  });
});
