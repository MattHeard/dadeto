import { jest } from '@jest/globals';
import {
  createGetApiKeyCreditV2Handler,
  extractUuid,
} from '../../../../src/core/cloud/get-api-key-credit-v2/core.js';

describe('extractUuid', () => {
  it('extracts the UUID from the request path', () => {
    expect(
      extractUuid({
        path: '/api-keys/123e4567-e89b-12d3-a456-426614174000/credit',
      })
    ).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('falls back to params when the path is missing', () => {
    expect(
      extractUuid({
        params: { uuid: 'abc-def' },
      })
    ).toBe('abc-def');
  });

  it('falls back to query when the path and params are missing', () => {
    expect(
      extractUuid({
        query: { uuid: 'query-uuid' },
      })
    ).toBe('query-uuid');
  });

  it('ignores non-matching path segments when extracting the UUID', () => {
    expect(
      extractUuid({
        path: '/api-keys/not-a-valid-uuid/credit',
        params: { uuid: 'fallback-param' },
      })
    ).toBe('fallback-param');
  });

  it('returns an empty string when no UUID can be found', () => {
    expect(extractUuid({})).toBe('');
  });

  it('returns an empty string when request is missing', () => {
    expect(extractUuid()).toBe('');
  });
});

describe('createGetApiKeyCreditV2Handler', () => {
  it('throws when fetchCredit is not a function', () => {
    expect(() => createGetApiKeyCreditV2Handler({ fetchCredit: null })).toThrow(
      new TypeError('fetchCredit must be a function')
    );
  });

  it('throws when fetchCredit is missing', () => {
    expect(() => createGetApiKeyCreditV2Handler()).toThrow(
      new TypeError('fetchCredit must be a function')
    );
  });

  it('returns 405 when the method is not GET', async () => {
    const fetchCredit = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({ fetchCredit });
    await expect(handler({ method: 'POST' })).resolves.toEqual({
      status: 405,
      body: 'Method Not Allowed',
      headers: { Allow: 'GET' },
    });
    expect(fetchCredit).not.toHaveBeenCalled();
  });

  it('returns 400 when the UUID cannot be determined', async () => {
    const fetchCredit = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({ fetchCredit });
    await expect(handler({ method: 'GET' })).resolves.toEqual({
      status: 400,
      body: 'Missing UUID',
    });
    expect(fetchCredit).not.toHaveBeenCalled();
  });

  it('returns 200 with the credit when found', async () => {
    const fetchCredit = jest.fn().mockResolvedValue(42);
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      getUuid: () => 'uuid-123',
    });
    await expect(handler({ method: 'GET' })).resolves.toEqual({
      status: 200,
      body: { credit: 42 },
    });
    expect(fetchCredit).toHaveBeenCalledWith('uuid-123');
  });

  it('returns 404 when the credit is not found', async () => {
    const fetchCredit = jest.fn().mockResolvedValue(null);
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      getUuid: () => 'uuid-123',
    });
    await expect(handler({ method: 'GET' })).resolves.toEqual({
      status: 404,
      body: 'Not found',
    });
    expect(fetchCredit).toHaveBeenCalledWith('uuid-123');
  });

  it('returns 500 and logs when fetchCredit throws', async () => {
    const error = new Error('boom');
    const fetchCredit = jest.fn().mockRejectedValue(error);
    const logError = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      getUuid: () => 'uuid-123',
      logError,
    });
    await expect(handler({ method: 'GET' })).resolves.toEqual({
      status: 500,
      body: 'Internal error',
    });
    expect(fetchCredit).toHaveBeenCalledWith('uuid-123');
    expect(logError).toHaveBeenCalledWith(error);
  });

  it('falls back to extractUuid when getUuid is not a function', async () => {
    const fetchCredit = jest.fn().mockResolvedValue(7);
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      // @ts-expect-error - intentional non-function to exercise fallback branch.
      getUuid: 'not-a-function',
    });

    await expect(
      handler({
        method: 'GET',
        path: '/api-keys/123e4567-e89b-12d3-a456-426614174000/credit',
      })
    ).resolves.toEqual({
      status: 200,
      body: { credit: 7 },
    });

    expect(fetchCredit).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000'
    );
  });

  it('returns 405 when the method is not a string', async () => {
    const fetchCredit = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({ fetchCredit });

    await expect(handler()).resolves.toEqual({
      status: 405,
      body: 'Method Not Allowed',
      headers: { Allow: 'GET' },
    });

    expect(fetchCredit).not.toHaveBeenCalled();
  });

  it('returns 500 with default logger when fetchCredit throws', async () => {
    const error = new Error('fail');
    const fetchCredit = jest.fn().mockRejectedValue(error);
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      getUuid: () => 'uuid-123',
    });

    await expect(handler({ method: 'GET' })).resolves.toEqual({
      status: 500,
      body: 'Internal error',
    });

    expect(fetchCredit).toHaveBeenCalledWith('uuid-123');
  });
});
