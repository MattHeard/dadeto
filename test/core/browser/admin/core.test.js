import { jest } from '@jest/globals';
import {
  createAdminEndpointsPromise,
  DEFAULT_ADMIN_ENDPOINTS,
} from '../../../../src/core/browser/admin/core.js';

const createConfig = overrides => ({
  triggerRenderContentsUrl: 'https://example.com/render',
  markVariantDirtyUrl: 'https://example.com/mark',
  generateStatsUrl: 'https://example.com/stats',
  ...overrides,
});

describe('createAdminEndpointsPromise', () => {
  it('resolves with mapped endpoints when the loader succeeds', async () => {
    const loadStaticConfig = jest.fn().mockResolvedValue(
      createConfig({ markVariantDirtyUrl: undefined })
    );

    await expect(
      createAdminEndpointsPromise(loadStaticConfig)
    ).resolves.toEqual({
      triggerRenderContentsUrl: 'https://example.com/render',
      markVariantDirtyUrl: DEFAULT_ADMIN_ENDPOINTS.markVariantDirtyUrl,
      generateStatsUrl: 'https://example.com/stats',
    });
    expect(loadStaticConfig).toHaveBeenCalledTimes(1);
  });

  it('falls back to default endpoints when the loader rejects', async () => {
    const loadStaticConfig = jest.fn().mockRejectedValue(new Error('nope'));

    await expect(
      createAdminEndpointsPromise(loadStaticConfig)
    ).resolves.toEqual(DEFAULT_ADMIN_ENDPOINTS);
  });

  it('returns defaults when provided loader is not a function', async () => {
    await expect(createAdminEndpointsPromise(null)).resolves.toEqual(
      DEFAULT_ADMIN_ENDPOINTS
    );
  });
});
