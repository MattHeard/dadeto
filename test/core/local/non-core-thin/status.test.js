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

  test('formats failure output with a final summary count', () => {
    expect(
      nonCoreThinStatusTestOnly.formatNonCoreThinFailure({
        fileCount: 2,
        maxLines: 50,
        staleExemptions: ['src/browser/missing.js'],
        violations: [
          {
            filePath: 'src/browser/document.js',
            lines: 51,
          },
        ],
      })
    ).toEqual([
      'Stale non-core thin exemption: src/browser/missing.js',
      'src/browser/document.js has 51 lines; max non-core size is 50.',
      'Non-core thin check found 1 violation and 1 stale exemption across 2 files.',
    ]);
  });
});
