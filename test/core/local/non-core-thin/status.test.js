import { getNonCoreThinStatus } from '../../../../src/core/local/non-core-thin/status.js';

describe('non-core thin status', () => {
  test('reports the current repo status', () => {
    const status = getNonCoreThinStatus();

    expect(status).toMatchObject({
      isClean: true,
      maxLines: 50,
      exemptionCount: 48,
    });
    expect(status.fileCount).toBeGreaterThan(0);
    expect(status.staleExemptions).toEqual([]);
    expect(status.violations).toEqual([]);
  });
});
