import { jest } from '@jest/globals';
import {
  createGetApiKeyCreditV2Handler,
  extractUuid,
} from '../../../../src/core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js';

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
  it('uses default dependencies when none are provided', () => {
    expect(() => createGetApiKeyCreditV2Handler()).toThrow(
      new TypeError('fetchCredit must be a function')
    );
  });

  it('throws when fetchCredit is not a function', () => {
    expect(() =>
      createGetApiKeyCreditV2Handler({
        fetchCredit: null,
        applyCreditEvent: jest.fn(),
      })
    ).toThrow(new TypeError('fetchCredit must be a function'));
  });

  it('throws when applyCreditEvent is not a function', () => {
    expect(() =>
      createGetApiKeyCreditV2Handler({
        fetchCredit: jest.fn(),
        applyCreditEvent: null,
      })
    ).toThrow(new TypeError('applyCreditEvent must be a function'));
  });

  it('returns 405 when the method is not supported', async () => {
    const fetchCredit = jest.fn();
    const applyCreditEvent = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
    });

    await expect(handler({ method: 'DELETE' })).resolves.toEqual({
      status: 405,
      body: 'Method Not Allowed',
      headers: { Allow: 'GET, POST' },
    });
    expect(fetchCredit).not.toHaveBeenCalled();
    expect(applyCreditEvent).not.toHaveBeenCalled();
  });

  it('returns 500 when fetching the balance fails', async () => {
    const error = new Error('fetch failed');
    const fetchCredit = jest.fn().mockRejectedValue(error);
    const applyCreditEvent = jest.fn();
    const logError = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
      getUuid: () => 'uuid-123',
      logError,
    });

    await expect(handler({ method: 'GET' })).resolves.toEqual({
      status: 500,
      body: 'Internal error',
    });
    expect(fetchCredit).toHaveBeenCalledWith('uuid-123');
    expect(applyCreditEvent).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(error);
  });

  it('falls back to a noop logger when fetchCredit fails and no logger is supplied', async () => {
    const error = new Error('fetch failed without logger');
    const fetchCredit = jest.fn().mockRejectedValue(error);
    const applyCreditEvent = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
      getUuid: () => 'uuid-123',
    });

    await expect(handler({ method: 'GET' })).resolves.toEqual({
      status: 500,
      body: 'Internal error',
    });
    expect(fetchCredit).toHaveBeenCalledWith('uuid-123');
    expect(applyCreditEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when the UUID cannot be determined', async () => {
    const fetchCredit = jest.fn();
    const applyCreditEvent = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
    });

    await expect(handler({ method: 'GET' })).resolves.toEqual({
      status: 400,
      body: 'Missing UUID',
    });
    expect(fetchCredit).not.toHaveBeenCalled();
    expect(applyCreditEvent).not.toHaveBeenCalled();
  });

  it('returns 200 with the credit when found', async () => {
    const fetchCredit = jest.fn().mockResolvedValue(42);
    const applyCreditEvent = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
      getUuid: () => 'uuid-123',
    });

    await expect(handler({ method: 'GET' })).resolves.toEqual({
      status: 200,
      body: { credit: 42 },
    });
    expect(fetchCredit).toHaveBeenCalledWith('uuid-123');
    expect(applyCreditEvent).not.toHaveBeenCalled();
  });

  it('uses the default request object when the handler is called without arguments', async () => {
    const fetchCredit = jest.fn().mockResolvedValue(9);
    const applyCreditEvent = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
      getUuid: () => 'uuid-123',
    });

    await expect(handler()).resolves.toEqual({
      status: 405,
      body: 'Method Not Allowed',
      headers: { Allow: 'GET, POST' },
    });
    expect(fetchCredit).not.toHaveBeenCalled();
    expect(applyCreditEvent).not.toHaveBeenCalled();
  });

  it('defaults to zero when fetchCredit returns a non-number', async () => {
    const fetchCredit = jest.fn().mockResolvedValue(null);
    const applyCreditEvent = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
      getUuid: () => 'uuid-123',
    });

    await expect(handler({ method: 'GET' })).resolves.toEqual({
      status: 200,
      body: { credit: 0 },
    });
    expect(fetchCredit).toHaveBeenCalledWith('uuid-123');
    expect(applyCreditEvent).not.toHaveBeenCalled();
  });

  it('returns 201 when credit is added', async () => {
    const fetchCredit = jest.fn();
    const applyCreditEvent = jest.fn().mockResolvedValue({
      status: 201,
      body: {
        credit: 25,
        type: 'credit_added',
        eventId: 'event-1',
        applied: true,
      },
    });
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
      getUuid: () => 'uuid-123',
    });

    await expect(
      handler({
        method: 'POST',
        body: {
          type: 'credit_added',
          eventId: 'event-1',
          amount: 25,
        },
      })
    ).resolves.toEqual({
      status: 201,
      body: {
        credit: 25,
        type: 'credit_added',
        eventId: 'event-1',
        applied: true,
      },
    });
    expect(fetchCredit).not.toHaveBeenCalled();
    expect(applyCreditEvent).toHaveBeenCalledWith('uuid-123', {
      type: 'credit_added',
      eventId: 'event-1',
      amount: 25,
    });
  });

  it('returns 400 when the event body is invalid', async () => {
    const fetchCredit = jest.fn();
    const applyCreditEvent = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
      getUuid: () => 'uuid-123',
    });

    await expect(
      handler({
        method: 'POST',
        body: {
          eventId: 'event-1',
          amount: 25,
        },
      })
    ).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid event type',
    });
    expect(fetchCredit).not.toHaveBeenCalled();
    expect(applyCreditEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when the event body is not an object', async () => {
    const fetchCredit = jest.fn();
    const applyCreditEvent = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
      getUuid: () => 'uuid-123',
    });

    await expect(
      handler({
        method: 'POST',
        body: null,
      })
    ).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid event body',
    });
    expect(fetchCredit).not.toHaveBeenCalled();
    expect(applyCreditEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when the event type is unsupported', async () => {
    const fetchCredit = jest.fn();
    const applyCreditEvent = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
      getUuid: () => 'uuid-123',
    });

    await expect(
      handler({
        method: 'POST',
        body: {
          type: 'credit_unknown',
          eventId: 'event-unsupported',
          amount: 1,
        },
      })
    ).resolves.toEqual({
      status: 400,
      body: 'Unsupported event type',
    });
    expect(fetchCredit).not.toHaveBeenCalled();
    expect(applyCreditEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when the idempotency uuid is missing', async () => {
    const fetchCredit = jest.fn();
    const applyCreditEvent = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
      getUuid: () => 'uuid-123',
    });

    await expect(
      handler({
        method: 'POST',
        body: {
          type: 'credit_added',
          amount: 1,
        },
      })
    ).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid idempotency UUID',
    });
    expect(fetchCredit).not.toHaveBeenCalled();
    expect(applyCreditEvent).not.toHaveBeenCalled();
  });

  it('returns 500 and logs when applyCreditEvent throws', async () => {
    const error = new Error('boom');
    const fetchCredit = jest.fn();
    const applyCreditEvent = jest.fn().mockRejectedValue(error);
    const logError = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
      getUuid: () => 'uuid-123',
      logError,
    });

    await expect(
      handler({
        method: 'POST',
        body: {
          type: 'credit_deducted',
          eventId: 'event-2',
          amount: 1,
        },
      })
    ).resolves.toEqual({
      status: 500,
      body: 'Internal error',
    });
    expect(fetchCredit).not.toHaveBeenCalled();
    expect(applyCreditEvent).toHaveBeenCalledWith('uuid-123', {
      type: 'credit_deducted',
      eventId: 'event-2',
      amount: 1,
    });
    expect(logError).toHaveBeenCalledWith(error);
  });

  it('returns 400 when the amount is invalid', async () => {
    const fetchCredit = jest.fn();
    const applyCreditEvent = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
      getUuid: () => 'uuid-123',
    });

    await expect(
      handler({
        method: 'POST',
        body: {
          type: 'credit_added',
          eventId: 'event-1',
          amount: 0,
        },
      })
    ).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid amount',
    });
    expect(fetchCredit).not.toHaveBeenCalled();
    expect(applyCreditEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when the amount is not finite', async () => {
    const fetchCredit = jest.fn();
    const applyCreditEvent = jest.fn();
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit,
      applyCreditEvent,
      getUuid: () => 'uuid-123',
    });

    await expect(
      handler({
        method: 'POST',
        body: {
          type: 'credit_added',
          eventId: 'event-1',
          amount: Number.NaN,
        },
      })
    ).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid amount',
    });
    expect(fetchCredit).not.toHaveBeenCalled();
    expect(applyCreditEvent).not.toHaveBeenCalled();
  });
});
