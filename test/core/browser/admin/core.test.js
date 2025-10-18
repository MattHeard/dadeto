import { jest } from '@jest/globals';
import {
  createAdminEndpointsPromise,
  DEFAULT_ADMIN_ENDPOINTS,
  createTriggerStats,
} from '../../../../src/core/browser/admin/core.js';

const createConfig = overrides => ({
  triggerRenderContentsUrl: 'https://example.com/render',
  markVariantDirtyUrl: 'https://example.com/mark',
  generateStatsUrl: 'https://example.com/stats',
  ...overrides,
});

describe('createTriggerStats', () => {
  const statsUrl = 'https://example.com/stats';

  it('invokes the stats endpoint and reports success', async () => {
    const getIdToken = jest.fn().mockReturnValue('token');
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ generateStatsUrl: statsUrl });
    const fetch = jest.fn().mockResolvedValue({});
    const showMessage = jest.fn();

    const triggerStats = createTriggerStats(
      getIdToken,
      getAdminEndpoints,
      fetch,
      showMessage
    );

    await triggerStats();

    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(getAdminEndpoints).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(statsUrl, {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
    });
    expect(showMessage).toHaveBeenCalledWith('Stats generated');
  });

  it('reports failure when no token is available', async () => {
    const getIdToken = jest.fn().mockReturnValue(null);
    const getAdminEndpoints = jest.fn();
    const fetch = jest.fn();
    const showMessage = jest.fn();

    const triggerStats = createTriggerStats(
      getIdToken,
      getAdminEndpoints,
      fetch,
      showMessage
    );

    await triggerStats();

    expect(getAdminEndpoints).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledWith('Stats generation failed');
  });

  it('reports failure when the endpoint invocation rejects', async () => {
    const getIdToken = jest.fn().mockReturnValue('token');
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ generateStatsUrl: statsUrl });
    const fetch = jest.fn().mockRejectedValue(new Error('nope'));
    const showMessage = jest.fn();

    const triggerStats = createTriggerStats(
      getIdToken,
      getAdminEndpoints,
      fetch,
      showMessage
    );

    await triggerStats();

    expect(showMessage).toHaveBeenCalledWith('Stats generation failed');
  });
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
