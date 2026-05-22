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
});
