import { jest } from '@jest/globals';

import {
  DEFAULT_MODERATION_ENDPOINTS,
  mapConfigToModerationEndpoints,
  createModerationEndpointsPromise,
  createGetModerationEndpoints,
  createGetModerationEndpointsFromStaticConfig,
} from '../../../../src/core/browser/moderation/endpoints.js';

describe('mapConfigToModerationEndpoints', () => {
  it('uses defaults when config is undefined', () => {
    const result = mapConfigToModerationEndpoints();

    expect(result).toEqual(DEFAULT_MODERATION_ENDPOINTS);
    expect(result).not.toBe(DEFAULT_MODERATION_ENDPOINTS);
  });

  it('merges provided config with defaults', () => {
    const result = mapConfigToModerationEndpoints({
      getModerationVariantUrl: 'https://example.com/variant',
    });

    expect(result).toEqual({
      ...DEFAULT_MODERATION_ENDPOINTS,
      getModerationVariantUrl: 'https://example.com/variant',
    });
  });
});

describe('createModerationEndpointsPromise', () => {
  it('resolves defaults when loader is missing', async () => {
    const result = await createModerationEndpointsPromise();

    expect(result).toEqual(DEFAULT_MODERATION_ENDPOINTS);
    expect(result).not.toBe(DEFAULT_MODERATION_ENDPOINTS);
  });

  it('normalizes values returned by the loader', async () => {
    const loadStaticConfig = jest.fn().mockResolvedValue({
      assignModerationJobUrl: 'https://example.com/assign',
    });

    const result = await createModerationEndpointsPromise(loadStaticConfig);

    expect(loadStaticConfig).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ...DEFAULT_MODERATION_ENDPOINTS,
      assignModerationJobUrl: 'https://example.com/assign',
    });
  });

  it('falls back to defaults and logs when loader rejects', async () => {
    const error = new Error('boom');
    const logger = { error: jest.fn() };
    const loadStaticConfig = jest.fn().mockRejectedValue(error);

    const result = await createModerationEndpointsPromise(loadStaticConfig, {
      logger,
    });

    expect(loadStaticConfig).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to load moderation endpoints, falling back to defaults.',
      error
    );
    expect(result).toEqual(DEFAULT_MODERATION_ENDPOINTS);
  });
});

describe('createGetModerationEndpoints', () => {
  it('throws when provided promise factory is not a function', () => {
    expect(() => createGetModerationEndpoints()).toThrow(
      new TypeError('createEndpointsPromiseFn must be a function')
    );
  });

  it('memoizes the generated promise', async () => {
    const promise = Promise.resolve({ foo: 'bar' });
    const factory = jest.fn(() => promise);
    const getModerationEndpoints = createGetModerationEndpoints(factory);

    const [first, second] = await Promise.all([
      getModerationEndpoints(),
      getModerationEndpoints(),
    ]);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ foo: 'bar' });
    expect(second).toBe(first);
  });
});

describe('createGetModerationEndpointsFromStaticConfig', () => {
  it('memoizes loader-backed endpoints', async () => {
    const loadStaticConfig = jest
      .fn()
      .mockResolvedValue({ submitModerationRatingUrl: 'https://example.com' });

    const getModerationEndpoints =
      createGetModerationEndpointsFromStaticConfig(loadStaticConfig);

    const first = await getModerationEndpoints();
    const second = await getModerationEndpoints();

    expect(loadStaticConfig).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(first.submitModerationRatingUrl).toBe('https://example.com');
  });
});
