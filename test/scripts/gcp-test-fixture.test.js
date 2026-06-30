import { readFileSync } from 'node:fs';

describe('gcp-test fixture seed contract', () => {
  it('keeps the manually assigned page out of the next zero-rated assignment pool', () => {
    const source = readFileSync('scripts/gcp-test-fixture.js', 'utf8');

    expect(source).toContain('variant: firstVariantRef.path');
    expect(source).toContain('moderatorReputationSum: 1');
    expect(source).toContain('moderationRatingCount: 1');
    expect(source).toContain('moderatorReputationSum: 0');
    expect(source).toContain('moderationRatingCount: 0');
  });

  it('retries transient seed uploads before failing the workflow', () => {
    const source = readFileSync('scripts/gcp-test-fixture.js', 'utf8');

    expect(source).toContain('retryTransientSeedStep');
    expect(source).toContain('Premature close');
    expect(source).toContain('TRANSIENT_SEED_ATTEMPTS');
  });

  it('uses explicit service account credentials for the storage client when available', () => {
    const source = readFileSync('scripts/gcp-test-fixture.js', 'utf8');

    expect(source).toContain("const { OAuth2Client } = runtimeDepsRequire('google-auth-library');");
    expect(source).toContain('const accessToken = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;');
    expect(source).toContain('authClient.setCredentials({ access_token: accessToken });');
    expect(source).toContain('return new Storage({ projectId, authClient });');
    expect(source).toContain('await resetFirestore(db);');
    expect(source).toContain('createStorageClient(projectId)');
    expect(source).toContain('credentials: {');
    expect(source).toContain('client_email: credentials.client_email');
    expect(source).toContain('private_key: credentials.private_key');
  });
});
