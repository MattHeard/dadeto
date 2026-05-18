import { getNonCoreThinStatus } from '../../../../src/core/local/non-core-thin/status.js';

describe('non-core thin status', () => {
  test('reports the current repo status', () => {
    const status = getNonCoreThinStatus();

    expect(status).toMatchObject({ maxLines: 50 });
    expect(status.exemptionCount).toEqual(expect.any(Number));
    expect(status.fileCount).toBeGreaterThan(0);
    expect(status.staleExemptions).toEqual([]);
    expect(status.violations).toEqual([]);
  });
});
