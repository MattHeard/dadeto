import { describe, expect, test, jest } from '@jest/globals';
import { normalizeExpressRequest } from '../../../src/core/cloud/request-normalization.js';

describe('normalizeExpressRequest', () => {
  test('normalizes method, body, headers, and request getter', () => {
    const request = {
      method: 'POST',
      body: { ok: true },
      headers: { foo: 'bar' },
      get: jest.fn(name => `${name}-value`),
    };

    expect(normalizeExpressRequest(request)).toEqual({
      method: 'POST',
      body: { ok: true },
      get: expect.any(Function),
      headers: { foo: 'bar' },
    });

    const normalized = normalizeExpressRequest(request);
    expect(normalized.get('X-Test')).toBe('X-Test-value');
    expect(request.get).toHaveBeenCalledWith('X-Test');
  });

  test('returns undefined getter when request getter is not callable', () => {
    expect(normalizeExpressRequest({ get: 'nope' })).toEqual({
      method: undefined,
      body: undefined,
      get: undefined,
      headers: undefined,
    });
  });

  test('handles missing request objects', () => {
    expect(normalizeExpressRequest()).toEqual({
      method: undefined,
      body: undefined,
      get: undefined,
      headers: undefined,
    });
  });
});
