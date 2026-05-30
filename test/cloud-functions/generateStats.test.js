import { jest } from '@jest/globals';

describe('cloud generate-stats entrypoint', () => {
  it('re-exports the cloud function from the core runner', async () => {
    const generateStats = { label: 'generate-stats' };
    const runGenerateStats = jest.fn(() => ({ generateStats }));

    await jest.unstable_mockModule(
      '../../src/core/cloud/generate-stats/run.js',
      () => ({
        runGenerateStats,
      })
    );

    const module = await import('../../src/cloud/generate-stats/index.js');

    expect(runGenerateStats).toHaveBeenCalledTimes(1);
    expect(module.generateStats).toBe(generateStats);
  });
});
