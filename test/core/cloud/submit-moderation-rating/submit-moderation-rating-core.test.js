import { jest } from '@jest/globals';
import {
  createCorsOptions,
  createHandleSubmitModerationRating,
  createSubmitModerationRatingResponder,
} from '../../../../src/core/cloud/submit-moderation-rating/submit-moderation-rating-core.js';

describe('createCorsOptions', () => {
  it('whitelists origins and rejects others', () => {
    const cors = createCorsOptions({ allowedOrigins: ['https://allowed'] });
    const cb = jest.fn();

    cors.origin('https://allowed', cb);
    expect(cb).toHaveBeenCalledWith(null, true);

    cb.mockClear();
    cors.origin('https://blocked', cb);
    expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(cb.mock.calls[0][0].message).toBe('CORS');
  });

  it('defaults to POST method when unspecified', () => {
    const cors = createCorsOptions({ allowedOrigins: [] });
    expect(cors.methods).toEqual(['POST']);
  });

  it('allows requests with missing origin', () => {
    const cors = createCorsOptions({ allowedOrigins: ['https://allowed'] });
    const cb = jest.fn();

    cors.origin(undefined, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('falls back to an empty origin list when allowedOrigins is not an array', () => {
    const cors = createCorsOptions({ allowedOrigins: null });
    const cb = jest.fn();

    cors.origin('https://allowed', cb);
    expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(cb.mock.calls[0][0].message).toBe('CORS');
  });
});

describe('createSubmitModerationRatingResponder', () => {
  const verifyIdToken = jest.fn();
  const fetchModeratorAssignment = jest.fn();
  const recordModerationRating = jest.fn();
  const randomUUID = jest.fn(() => 'rating-id');
  const getServerTimestamp = jest.fn(() => 'ts');

  const responder = createSubmitModerationRatingResponder({
    verifyIdToken,
    fetchModeratorAssignment,
    recordModerationRating,
    randomUUID,
    getServerTimestamp,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('treats missing requests as non-POST submissions', async () => {
    const response = await responder();
    expect(response).toEqual({ status: 405, body: 'POST only' });
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects non-POST requests', async () => {
    await expect(responder({ method: 'GET' })).resolves.toEqual({
      status: 405,
      body: 'POST only',
    });
  });

  it('validates body and authorization header formats', async () => {
    await expect(responder({ method: 'POST', body: {} })).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid isApproved',
    });

    await expect(
      responder({ method: 'POST', body: { isApproved: true } })
    ).resolves.toEqual({
      status: 401,
      body: 'Missing or invalid Authorization header',
    });
  });

  it('handles invalid tokens and missing assignments', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('expired'));
    const response = await responder({
      method: 'POST',
      body: { isApproved: false },
      headers: { Authorization: 'Bearer bad' },
    });
    expect(response).toEqual({ status: 401, body: 'expired' });

    verifyIdToken.mockResolvedValueOnce({ uid: 'mod-1' });
    fetchModeratorAssignment.mockResolvedValueOnce(null);
    const noJob = await responder({
      method: 'POST',
      body: { isApproved: true },
      headers: { Authorization: 'Bearer token' },
    });
    expect(noJob).toEqual({ status: 404, body: 'No moderation job' });
  });

  it('consumes Authorization getter before fallback', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'mod-4' });
    const assignment = {
      variantId: 'variant-alt',
      clearAssignment: jest.fn().mockResolvedValue(undefined),
    };
    fetchModeratorAssignment.mockResolvedValueOnce(assignment);
    recordModerationRating.mockResolvedValueOnce(undefined);

    const response = await responder({
      method: 'POST',
      body: { isApproved: false },
      get: name =>
        name === 'Authorization' ? 'Bearer getterToken' : undefined,
    });

    expect(recordModerationRating).toHaveBeenCalledWith(
      expect.objectContaining({
        moderatorId: 'mod-4',
      })
    );
    expect(response).toEqual({ status: 201, body: {} });
  });

  it('records moderation ratings and clears assignments', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'mod-1' });
    const clearAssignment = jest.fn().mockResolvedValue(undefined);
    fetchModeratorAssignment.mockResolvedValueOnce({
      variantId: 'variant-123',
      clearAssignment,
    });
    recordModerationRating.mockResolvedValueOnce(undefined);

    const response = await responder({
      method: 'POST',
      body: { isApproved: false },
      headers: { Authorization: 'Bearer token' },
    });

    expect(recordModerationRating).toHaveBeenCalledWith({
      id: 'rating-id',
      moderatorId: 'mod-1',
      variantId: 'variant-123',
      isApproved: false,
      ratedAt: 'ts',
    });
    expect(clearAssignment).toHaveBeenCalled();
    expect(response).toEqual({ status: 201, body: {} });
  });

  it('treats non-string authorization fallbacks as missing', async () => {
    await expect(
      responder({
        method: 'POST',
        body: { isApproved: true },
        get: name =>
          name === 'Authorization'
            ? undefined
            : name === 'authorization'
              ? 123
              : undefined,
      })
    ).resolves.toEqual({
      status: 401,
      body: 'Missing or invalid Authorization header',
    });
  });

  it('rejects invalid header arrays and non-Bearer strings', async () => {
    await expect(
      responder({
        method: 'POST',
        body: { isApproved: true },
        headers: { Authorization: [123] },
      })
    ).resolves.toEqual({
      status: 401,
      body: 'Missing or invalid Authorization header',
    });

    await expect(
      responder({
        method: 'POST',
        body: { isApproved: true },
        headers: { Authorization: 'Basic auth' },
      })
    ).resolves.toEqual({
      status: 401,
      body: 'Missing or invalid Authorization header',
    });
  });

  it('returns invalid token message when verification lacks details', async () => {
    verifyIdToken.mockRejectedValueOnce({});

    const response = await responder({
      method: 'POST',
      body: { isApproved: false },
      headers: { Authorization: 'Bearer token' },
    });

    expect(response).toEqual({
      status: 401,
      body: 'Invalid or expired token',
    });
  });

  it('rejects non-object request bodies', async () => {
    await expect(
      responder({
        method: 'POST',
        body: 'not-an-object',
        headers: { Authorization: 'Bearer token' },
      })
    ).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid isApproved',
    });
  });

  it('reads authorization via getter fallback and rejects empty variant assignments', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'mod-2' });
    fetchModeratorAssignment.mockResolvedValueOnce({ variantId: '' });

    const response = await responder({
      method: 'POST',
      body: { isApproved: true },
      get: name => (name === 'authorization' ? 'Bearer token' : undefined),
    });

    expect(response).toEqual({ status: 404, body: 'No moderation job' });
    expect(fetchModeratorAssignment).toHaveBeenCalledWith('mod-2');
  });

  it('accepts array headers and skips clearing when no callback is provided', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'mod-3' });
    fetchModeratorAssignment.mockResolvedValueOnce({
      variantId: 'variant-789',
      clearAssignment: 'not-a-function',
    });
    recordModerationRating.mockResolvedValueOnce(undefined);

    const response = await responder({
      method: 'POST',
      body: { isApproved: true },
      headers: { authorization: ['Bearer arrayToken'] },
    });

    expect(recordModerationRating).toHaveBeenCalledWith(
      expect.objectContaining({
        moderatorId: 'mod-3',
        variantId: 'variant-789',
        isApproved: true,
      })
    );
    expect(response).toEqual({ status: 201, body: {} });
  });

  it('returns an auth error when the token lacks a uid', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: '' });

    const response = await responder({
      method: 'POST',
      body: { isApproved: false },
      headers: { authorization: 'Bearer token' },
    });

    expect(response).toEqual({ status: 401, body: 'Invalid or expired token' });
    expect(fetchModeratorAssignment).not.toHaveBeenCalled();
  });
});

describe('createHandleSubmitModerationRating', () => {
  it('normalizes Express requests and writes JSON/primitive bodies', async () => {
    const responder = jest
      .fn()
      .mockResolvedValueOnce({ status: 201, body: {} })
      .mockResolvedValueOnce({ status: 202, body: 'Accepted' })
      .mockResolvedValueOnce({ status: 204, body: undefined });

    const handle = createHandleSubmitModerationRating(responder);
    const res = {
      status: jest.fn(function status() {
        return res;
      }),
      json: jest.fn(),
      send: jest.fn(),
      sendStatus: jest.fn(),
    };

    await handle(
      {
        method: 'POST',
        body: { isApproved: true },
        get: name => (name === 'Authorization' ? 'Bearer token' : undefined),
        headers: {},
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({});

    await handle({ method: 'POST' }, res);
    expect(res.send).toHaveBeenCalledWith('Accepted');

    await handle({ method: 'POST' }, res);
    expect(res.sendStatus).toHaveBeenCalledWith(204);
  });

  it('wraps the header accessor defensively', async () => {
    const responder = jest.fn().mockResolvedValue({ status: 200, body: {} });
    const handle = createHandleSubmitModerationRating(responder);
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      send: jest.fn(),
      sendStatus: jest.fn(),
    };

    await handle({ method: 'POST', get: 'not-a-function' }, res);
    expect(responder).toHaveBeenCalledWith({
      method: 'POST',
      body: undefined,
      get: undefined,
      headers: undefined,
    });
  });

  it('handles undefined requests by forwarding an empty payload', async () => {
    const responder = jest
      .fn()
      .mockResolvedValue({ status: 418, body: undefined });
    const handle = createHandleSubmitModerationRating(responder);
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      send: jest.fn(),
      sendStatus: jest.fn(),
    };

    await handle(undefined, res);

    expect(responder).toHaveBeenCalledWith({});
    expect(res.sendStatus).toHaveBeenCalledWith(418);
  });

  it('exposes the normalized get accessor to the responder', async () => {
    const responder = jest.fn().mockResolvedValue({ status: 200, body: {} });
    const handle = createHandleSubmitModerationRating(responder);
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      send: jest.fn(),
      sendStatus: jest.fn(),
    };

    const req = {
      method: 'POST',
      body: { isApproved: true },
      get: jest.fn(name =>
        name === 'Authorization' ? 'Bearer him' : undefined
      ),
    };

    await handle(req, res);

    const forwarded = responder.mock.calls[0][0];
    expect(typeof forwarded.get).toBe('function');
    expect(forwarded.get('Authorization')).toBe('Bearer him');
    expect(req.get).toHaveBeenCalledWith('Authorization');
  });
});
