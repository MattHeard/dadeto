import { describe, test, expect, jest } from '@jest/globals';
import {
  createCorsOptions,
  createSubmitModerationRatingResponder,
} from '../../../src/core/cloud/submit-moderation-rating/submit-moderation-rating-core.js';
import { MISSING_AUTHORIZATION_RESPONSE } from '../../../src/core/cloud/cloud-core.js';
import { METHOD_NOT_ALLOWED_RESPONSE } from '../../../src/core/cloud/http-method-guard.js';

/**
 * Build a default request shaped like the HTTP handler input.
 * @param {object} [overrides] Properties to override on the default request.
 * @returns {object} Express-style request stub for the responder.
 */
function createRequest(overrides = {}) {
  return {
    method: 'POST',
    body: { isApproved: true },
    get: name => (name === 'Authorization' ? 'Bearer token' : null),
    ...overrides,
  };
}

/**
 * Assemble the dependencies required by the responder for happy-path scenarios.
 * @param {object} [overrides] Values that override the default dependency mocks.
 * @returns {{ dependencies: object, clearAssignment: jest.Mock }} Mocks wired into the responder.
 */
function buildDependencies(overrides = {}) {
  const clearAssignment = jest.fn();
  const dependencies = {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'moderator-1' }),
    fetchModeratorAssignment: jest
      .fn()
      .mockResolvedValue({ variantId: 'variant-1', clearAssignment }),
    recordModerationRating: jest.fn().mockResolvedValue(),
    randomUUID: jest.fn().mockReturnValue('rating-1'),
    getServerTimestamp: jest.fn().mockReturnValue('now'),
    ...overrides,
  };

  return { dependencies, clearAssignment };
}

describe('submit moderation rating', () => {
  test('builds CORS options that enforce the allow list', () => {
    const options = createCorsOptions({
      allowedOrigins: ['https://allowed.example'],
      methods: ['POST', 'OPTIONS'],
    });

    const allowedCallback = jest.fn();
    options.origin('https://allowed.example', allowedCallback);
    expect(allowedCallback).toHaveBeenCalledWith(null, true);

    const blockedCallback = jest.fn();
    options.origin('https://blocked.example', blockedCallback);
    expect(blockedCallback.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(blockedCallback.mock.calls[0][0]?.message).toBe('CORS');
    expect(blockedCallback.mock.calls[0][1]).toBeUndefined();

    expect(options.methods).toEqual(['POST', 'OPTIONS']);
  });

  test('submits a rating when prerequisites succeed', async () => {
    const { dependencies, clearAssignment } = buildDependencies();
    const responder = createSubmitModerationRatingResponder(dependencies);
    const response = await responder(createRequest());

    expect(response).toEqual({ status: 201, body: {} });
    expect(dependencies.fetchModeratorAssignment).toHaveBeenCalledWith(
      'moderator-1'
    );
    expect(dependencies.recordModerationRating).toHaveBeenCalledWith({
      id: 'rating-1',
      moderatorId: 'moderator-1',
      variantId: 'variant-1',
      isApproved: true,
      ratedAt: 'now',
    });
    expect(clearAssignment).toHaveBeenCalled();
  });

  test('rejects non-POST requests', async () => {
    const { dependencies } = buildDependencies();
    const responder = createSubmitModerationRatingResponder(dependencies);
    const response = await responder(createRequest({ method: 'GET' }));

    expect(response).toBe(METHOD_NOT_ALLOWED_RESPONSE);
  });

  test('rejects invalid payloads', async () => {
    const { dependencies } = buildDependencies();
    const responder = createSubmitModerationRatingResponder(dependencies);
    const response = await responder(
      createRequest({ body: { isApproved: 'no' } })
    );

    expect(response).toEqual({
      status: 400,
      body: 'Missing or invalid isApproved',
    });
  });

  test('requires an authorization header', async () => {
    const { dependencies } = buildDependencies();
    const responder = createSubmitModerationRatingResponder(dependencies);
    const response = await responder(
      createRequest({ get: () => null, headers: undefined })
    );

    expect(response).toEqual(MISSING_AUTHORIZATION_RESPONSE);
  });

  test('lowers the token fallback message when verifier rejects primitive', async () => {
    const { dependencies } = buildDependencies({
      verifyIdToken: jest.fn().mockRejectedValue('primitive rejection'),
    });
    const responder = createSubmitModerationRatingResponder(dependencies);
    const response = await responder(createRequest());

    expect(response).toEqual({
      status: 401,
      body: 'Invalid or expired token',
    });
    expect(dependencies.fetchModeratorAssignment).not.toHaveBeenCalled();
    expect(dependencies.recordModerationRating).not.toHaveBeenCalled();
  });
});
