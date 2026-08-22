import { describe, expect, jest, it } from '@jest/globals';
import {
  createLoadStaticConfig,
  parseStaticConfigResponse,
} from '../../../src/core/browser/load-static-config-core.js';

describe('parseStaticConfigResponse', () => {
  it('parses successful responses', async () => {
    const json = jest.fn().mockResolvedValue({ feature: true });

    await expect(
      parseStaticConfigResponse({ ok: true, json })
    ).resolves.toEqual({ feature: true });
    expect(json).toHaveBeenCalledTimes(1);
  });

  it.each([
    [null, 'unknown'],
    [undefined, 'unknown'],
    [{ ok: false, status: 503 }, '503'],
    [{ ok: false }, 'unknown'],
  ])(
    'rejects unsuccessful response %p with status %s',
    async (response, status) => {
      await expect(parseStaticConfigResponse(response)).rejects.toThrow(
        `Failed to load static config: ${status}`
      );
    }
  );
});

describe('createLoadStaticConfig', () => {
  it('validates fetchFn', () => {
    expect(() => createLoadStaticConfig()).toThrow(
      new TypeError('fetchFn must be a function')
    );
    expect(() => createLoadStaticConfig({ fetchFn: null })).toThrow(
      new TypeError('fetchFn must be a function')
    );
  });

  it('fetches config with no-store and memoizes the parsed payload', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ mode: 'test' }),
    });
    const load = createLoadStaticConfig({ fetchFn });

    const first = await load();
    const second = await load();

    expect(first).toEqual({ mode: 'test' });
    expect(second).toBe(first);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('/config.json', { cache: 'no-store' });
  });

  it('warns and returns an empty object when fetching fails', async () => {
    const error = new Error('offline');
    const fetchFn = jest.fn().mockRejectedValue(error);
    const warn = jest.fn();
    const load = createLoadStaticConfig({ fetchFn, warn });

    await expect(load()).resolves.toEqual({});
    expect(warn).toHaveBeenCalledWith('Failed to load static config', error);
  });

  it('accepts an omitted warning logger', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    const load = createLoadStaticConfig({ fetchFn });

    await expect(load()).resolves.toEqual({});
  });
});
