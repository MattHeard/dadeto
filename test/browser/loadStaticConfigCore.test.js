import { describe, it, expect, jest } from '@jest/globals';
import {
  parseStaticConfigResponse,
  createLoadStaticConfig,
} from '../../src/core/browser/load-static-config-core.js';

describe('parseStaticConfigResponse', () => {
  it('resolves with parsed json when response is ok', async () => {
    const payload = { featureFlag: true };
    const json = jest.fn().mockResolvedValue(payload);
    const response = { ok: true, json };

    await expect(parseStaticConfigResponse(response)).resolves.toBe(payload);
    expect(json).toHaveBeenCalledTimes(1);
  });

  it('throws an error when response is not ok', async () => {
    const json = jest.fn();
    const response = { ok: false, status: 503, json };

    await expect(parseStaticConfigResponse(response)).rejects.toThrow(
      'Failed to load static config: 503'
    );
    expect(json).not.toHaveBeenCalled();
  });

  it('uses an unknown status placeholder when the response is missing', async () => {
    await expect(parseStaticConfigResponse()).rejects.toThrow(
      'Failed to load static config: unknown'
    );
  });

  it('uses an unknown status placeholder when the response status is undefined', async () => {
    const response = { ok: false, json: jest.fn() };
    await expect(parseStaticConfigResponse(response)).rejects.toThrow(
      'Failed to load static config: unknown'
    );
  });
});

describe('createLoadStaticConfig', () => {
  it('throws when fetchFn is missing', () => {
    expect(() => createLoadStaticConfig()).toThrow(
      'fetchFn must be a function'
    );
  });

  it('memoizes the fetch promise and returns parsed config', async () => {
    const payload = { featureFlag: true };
    const json = jest.fn().mockResolvedValue(payload);
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json });
    const warn = jest.fn();

    const loadStaticConfig = createLoadStaticConfig({ fetchFn, warn });

    await expect(loadStaticConfig()).resolves.toEqual(payload);
    await expect(loadStaticConfig()).resolves.toEqual(payload);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('logs a warning and returns empty config on fetch failure', async () => {
    const error = new Error('network down');
    const fetchFn = jest.fn().mockRejectedValue(error);
    const warn = jest.fn();

    const loadStaticConfig = createLoadStaticConfig({ fetchFn, warn });

    await expect(loadStaticConfig()).resolves.toEqual({});
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('Failed to load static config', error);
  });

  it('defaults warn logger to a noop when not provided', async () => {
    const payload = { value: 1 };
    const json = jest.fn().mockResolvedValue(payload);
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json });

    const loadStaticConfig = createLoadStaticConfig({ fetchFn });

    await expect(loadStaticConfig()).resolves.toEqual(payload);
  });

  it('uses the noop warn helper when a non-function is supplied', async () => {
    const payload = { value: 2 };
    const json = jest.fn().mockResolvedValue(payload);
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json });

    const loadStaticConfig = createLoadStaticConfig({
      fetchFn,
      warn: 'not-a-function',
    });

    await expect(loadStaticConfig()).resolves.toEqual(payload);
  });

  it('uses the noop warn helper when the fetch fails', async () => {
    const error = new Error('broken');
    const fetchFn = jest.fn().mockRejectedValue(error);

    const loadStaticConfig = createLoadStaticConfig({ fetchFn });

    await expect(loadStaticConfig()).resolves.toEqual({});
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
