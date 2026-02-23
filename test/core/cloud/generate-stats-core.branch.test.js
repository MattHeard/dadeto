import { jest } from '@jest/globals';
import { createGenerateStatsCore } from '../../../src/core/cloud/generate-stats/generate-stats-core.js';

describe('generate stats helpers', () => {
  const baseDeps = {
    db: {},
    auth: {},
    storage: { bucket: () => ({ file: () => ({ save: jest.fn() }) }) },
    env: {},
    urlMap: 'map',
    cryptoModule: { randomUUID: () => 'uuid' },
  };

  test('getAccessTokenFromMetadata throws when metadata token invalid', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 123 }),
    });
    const core = createGenerateStatsCore({
      ...baseDeps,
      fetchFn: fetchMock,
    });

    await expect(core.getAccessTokenFromMetadata()).rejects.toThrow(
      'invalid access_token in metadata response'
    );
  });

  test('invalidatePaths logs failure when request fails', async () => {
    const responses = [
      { ok: true, json: async () => ({ access_token: 'token' }) },
      { ok: false, status: 500 },
    ];
    const fetchMock = jest
      .fn()
      .mockImplementation(() => Promise.resolve(responses.shift()));
    const logger = { error: jest.fn() };
    const core = createGenerateStatsCore({
      ...baseDeps,
      fetchFn: fetchMock,
    });

    await core.invalidatePaths(['/stats.html'], logger);
    expect(logger.error).toHaveBeenCalledWith(
      'invalidate /stats.html failed: 500'
    );
  });
});
