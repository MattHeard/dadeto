import { jest, describe, expect, test, beforeEach } from '@jest/globals';

const reportFailuresAndMaybeLogSuccess = jest.fn();

await jest.unstable_mockModule('../../../../src/core/commonCore.js', () => ({
  reportFailuresAndMaybeLogSuccess,
}));

const { nonCoreThinStatusTestOnly } = await import(
  '../../../../src/core/local/non-core-thin/status.js'
);

describe('non-core thin status fallback branch', () => {
  beforeEach(() => {
    reportFailuresAndMaybeLogSuccess.mockReset();
  });

  test('returns a clean result when the shared reporter says no failures were emitted', () => {
    reportFailuresAndMaybeLogSuccess.mockReturnValue(false);

    const logs = [];
    const errors = [];
    const exitCodes = [];
    const handle = nonCoreThinStatusTestOnly.createCheckNonCoreThinHandle({
      getStatus: () => ({
        isClean: false,
        fileCount: 1,
        exemptionCount: 0,
        maxLines: 50,
      }),
      formatFailure: () => ['failure line'],
      output: {
        error: line => errors.push(line),
        log: line => logs.push(line),
      },
      setExitCode: exitCode => {
        exitCodes.push(exitCode);
      },
    });

    expect(handle()).toEqual({ exitCode: 0, failures: [] });
    expect(reportFailuresAndMaybeLogSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        failures: ['failure line'],
        successMessage:
          'Checked 1 non-core JS files; 0 baseline exemptions; max 50 lines.',
      })
    );
    expect(logs).toEqual([]);
    expect(errors).toEqual([]);
    expect(exitCodes).toEqual([]);
  });
});
