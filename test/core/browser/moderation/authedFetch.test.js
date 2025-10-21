import { jest } from '@jest/globals';
import { createAuthedFetch } from '../../../../src/core/browser/moderation/authedFetch.js';

describe('createAuthedFetch', () => {
  let originalHeaders;

  beforeEach(() => {
    originalHeaders = global.Headers;
  });

  afterEach(() => {
    global.Headers = originalHeaders;
  });

  it('throws when getIdToken is not a function', () => {
    expect(() =>
      createAuthedFetch({
        getIdToken: null,
        fetchJson: jest.fn(),
      })
    ).toThrow(new TypeError('getIdToken must be a function'));
  });

  it('throws when fetchJson is not a function', () => {
    expect(() =>
      createAuthedFetch({
        getIdToken: jest.fn(),
        fetchJson: null,
      })
    ).toThrow(new TypeError('fetchJson must be a function'));
  });

  it('injects authorization and default headers', async () => {
    const getIdToken = jest.fn().mockResolvedValue('abc');
    const fetchJson = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => ({ ok: true }),
    });
    const authedFetch = createAuthedFetch({ getIdToken, fetchJson });

    const result = await authedFetch('https://example.com/api', {
      method: 'POST',
      headers: { 'X-Test': '1' },
      body: 'payload',
    });

    expect(fetchJson).toHaveBeenCalledWith('https://example.com/api', {
      method: 'POST',
      body: 'payload',
      headers: {
        'Content-Type': 'application/json',
        'X-Test': '1',
        Authorization: 'Bearer abc',
      },
    });
    expect(result).toEqual({ ok: true });
  });

  it('allows custom content type to override the default', async () => {
    const getIdToken = jest.fn().mockResolvedValue('override');
    const fetchJson = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => ({ done: true }),
    });
    const authedFetch = createAuthedFetch({ getIdToken, fetchJson });

    await authedFetch('https://example.com', {
      headers: { 'Content-Type': 'text/plain' },
    });

    expect(fetchJson).toHaveBeenCalledWith('https://example.com', {
      headers: {
        'Content-Type': 'text/plain',
        Authorization: 'Bearer override',
      },
    });
  });

  it('throws when no token is available', async () => {
    const getIdToken = jest.fn().mockResolvedValue(null);
    const fetchJson = jest.fn();
    const authedFetch = createAuthedFetch({ getIdToken, fetchJson });

    await expect(authedFetch('https://example.com')).rejects.toThrow(
      'not signed in'
    );
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it('propagates fetch errors', async () => {
    const getIdToken = jest.fn().mockResolvedValue('token');
    const fetchJson = jest.fn().mockRejectedValue(new Error('network down'));
    const authedFetch = createAuthedFetch({ getIdToken, fetchJson });

    await expect(authedFetch('https://example.com')).rejects.toThrow(
      'network down'
    );
  });

  it('normalizes header instances to plain objects', async () => {
    class MockHeaders {
      constructor(init = {}) {
        this.map = new Map(Object.entries(init));
      }

      entries() {
        return this.map.entries();
      }
    }

    global.Headers = MockHeaders;

    const getIdToken = jest.fn().mockResolvedValue('header-token');
    const fetchJson = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => ({ ok: true }),
    });
    const authedFetch = createAuthedFetch({ getIdToken, fetchJson });

    const headers = new MockHeaders({ Accept: 'application/json' });

    await authedFetch('https://example.com/headers', { headers });

    expect(fetchJson).toHaveBeenCalledWith('https://example.com/headers', {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer header-token',
      },
    });
  });

  it('returns raw responses when no json function is present', async () => {
    const getIdToken = jest.fn().mockResolvedValue('raw');
    const response = { ok: true, status: 204 };
    const fetchJson = jest.fn().mockResolvedValue(response);
    const authedFetch = createAuthedFetch({ getIdToken, fetchJson });

    const result = await authedFetch('https://example.com/raw');

    expect(result).toBe(response);
  });

  it('returns non-standard responses untouched when ok is absent', async () => {
    const getIdToken = jest.fn().mockResolvedValue('raw');
    const response = { payload: { done: true } };
    const fetchJson = jest.fn().mockResolvedValue(response);
    const authedFetch = createAuthedFetch({ getIdToken, fetchJson });

    const result = await authedFetch('https://example.com/no-ok');

    expect(result).toBe(response);
  });

  it('converts non-ok responses into errors with status', async () => {
    const getIdToken = jest.fn().mockResolvedValue('token');
    const fetchJson = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: jest.fn(),
    });
    const authedFetch = createAuthedFetch({ getIdToken, fetchJson });

    await expect(authedFetch('https://example.com')).rejects.toMatchObject({
      message: 'HTTP 403',
      status: 403,
    });
  });
});
