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
});
