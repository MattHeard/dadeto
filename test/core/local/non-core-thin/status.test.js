import {
  getNonCoreThinStatus,
  nonCoreThinStatusTestOnly,
} from '../../../../src/core/local/non-core-thin/status.js';

describe('non-core thin status', () => {
  test('reports the current repo status', () => {
    const status = getNonCoreThinStatus();

    expect(status).toMatchObject({ maxLines: 50 });
    expect(status.exemptionCount).toEqual(expect.any(Number));
    expect(status.fileCount).toBeGreaterThan(0);
    expect(status.staleExemptions).toEqual([]);
    expect(status.isClean).toBe(false);
    expect(status.exemptionCount).toBe(0);
    expect(status.violations.length).toBeGreaterThan(0);
  });

  test('builds a clean status and reports stale exemptions when data says so', () => {
    expect(
      nonCoreThinStatusTestOnly.buildNonCoreThinStatus(
        { maxLines: 50, exemptions: {} },
        []
      )
    ).toEqual({
      isClean: true,
      maxLines: 50,
      fileCount: 0,
      exemptionCount: 0,
      staleExemptions: [],
      violations: [],
    });

    expect(
      nonCoreThinStatusTestOnly.buildNonCoreThinStatus(
        {
          maxLines: 50,
          exemptions: {
            'src/browser/missing.js': 'stale',
          },
        },
        ['src/browser/document.js']
      )
    ).toEqual({
      isClean: false,
      maxLines: 50,
      fileCount: 1,
      exemptionCount: 1,
      staleExemptions: ['src/browser/missing.js'],
      violations: [
        {
          filePath: 'src/browser/document.js',
          lines: expect.any(Number),
        },
      ],
    });
  });
});
