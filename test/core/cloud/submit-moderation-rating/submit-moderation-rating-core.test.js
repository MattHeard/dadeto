import { jest } from '@jest/globals';
import {
  createCorsOptions,
  createHandleSubmitModerationRating,
  createSubmitModerationRatingResponder,
} from '../../../../src/core/cloud/submit-moderation-rating/submit-moderation-rating-core.js';

describe('submitModerationRating core', () => {
  describe('createSubmitModerationRatingResponder', () => {
    const createDependencies = ({
      verifyIdToken = jest.fn().mockResolvedValue({ uid: 'user-1' }),
      fetchModeratorAssignment = jest.fn().mockResolvedValue({
        variantId: '/variants/1',
        clearAssignment: jest.fn().mockResolvedValue(),
      }),
      recordModerationRating = jest.fn().mockResolvedValue(),
      randomUUID = jest.fn().mockReturnValue('rating-1'),
      getServerTimestamp = jest.fn().mockReturnValue('now'),
    } = {}) => ({
      verifyIdToken,
      fetchModeratorAssignment,
      recordModerationRating,
      randomUUID,
      getServerTimestamp,
    });

    it('throws when verifyIdToken is not a function', () => {
      expect(() =>
        createSubmitModerationRatingResponder({
          verifyIdToken: null,
          fetchModeratorAssignment: jest.fn(),
          recordModerationRating: jest.fn(),
          randomUUID: jest.fn(),
          getServerTimestamp: jest.fn(),
        })
      ).toThrow(new TypeError('verifyIdToken must be a function'));
    });

    it('rejects non-POST requests', async () => {
      const responder =
        createSubmitModerationRatingResponder(createDependencies());

      await expect(
        responder({ method: 'GET', body: { isApproved: true } })
      ).resolves.toEqual({ status: 405, body: 'POST only' });
    });

    it('rejects missing isApproved flag', async () => {
      const responder =
        createSubmitModerationRatingResponder(createDependencies());

      await expect(responder({ method: 'POST', body: {} })).resolves.toEqual({
        status: 400,
        body: 'Missing or invalid isApproved',
      });
    });

    it('rejects when Authorization header is missing', async () => {
      const responder =
        createSubmitModerationRatingResponder(createDependencies());

      await expect(
        responder({ method: 'POST', body: { isApproved: true } })
      ).resolves.toEqual({
        status: 401,
        body: 'Missing or invalid Authorization header',
      });
    });

    it('propagates token verification errors as 401 responses', async () => {
      const verifyIdToken = jest.fn().mockRejectedValue(new Error('bad token'));
      const responder = createSubmitModerationRatingResponder(
        createDependencies({ verifyIdToken })
      );

      await expect(
        responder({
          method: 'POST',
          body: { isApproved: true },
          get: name => (name === 'Authorization' ? 'Bearer secret' : null),
        })
      ).resolves.toEqual({ status: 401, body: 'bad token' });
    });

    it('returns 404 when the moderator has no assignment', async () => {
      const fetchModeratorAssignment = jest.fn().mockResolvedValue(null);
      const responder = createSubmitModerationRatingResponder(
        createDependencies({ fetchModeratorAssignment })
      );

      await expect(
        responder({
          method: 'POST',
          body: { isApproved: true },
          headers: { Authorization: 'Bearer token' },
        })
      ).resolves.toEqual({ status: 404, body: 'No moderation job' });
    });

    it('records the rating and clears the assignment on success', async () => {
      const clearAssignment = jest.fn().mockResolvedValue();
      const fetchModeratorAssignment = jest
        .fn()
        .mockResolvedValue({ variantId: '/variants/123', clearAssignment });
      const recordModerationRating = jest.fn().mockResolvedValue();
      const randomUUID = jest.fn().mockReturnValue('rating-99');
      const getServerTimestamp = jest.fn().mockReturnValue('timestamp');
      const responder = createSubmitModerationRatingResponder(
        createDependencies({
          fetchModeratorAssignment,
          recordModerationRating,
          randomUUID,
          getServerTimestamp,
        })
      );

      await expect(
        responder({
          method: 'POST',
          body: { isApproved: false },
          headers: { Authorization: 'Bearer secure' },
        })
      ).resolves.toEqual({ status: 201, body: {} });

      expect(randomUUID).toHaveBeenCalledWith();
      expect(recordModerationRating).toHaveBeenCalledWith({
        id: 'rating-99',
        moderatorId: 'user-1',
        variantId: '/variants/123',
        isApproved: false,
        ratedAt: 'timestamp',
      });
      expect(clearAssignment).toHaveBeenCalledWith();
    });
  });

  describe('createHandleSubmitModerationRating', () => {
    it('sends JSON responses for object bodies', async () => {
      const responder = jest.fn().mockResolvedValue({ status: 201, body: {} });
      const handle = createHandleSubmitModerationRating(responder);
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status };

      await handle(
        { method: 'POST', body: { isApproved: true }, headers: {} },
        res
      );

      expect(responder).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST' })
      );
      expect(status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith({});
    });
  });

  describe('createCorsOptions', () => {
    it('allows requests with permitted origins', () => {
      const options = createCorsOptions({
        allowedOrigins: ['https://allowed.example'],
      });

      const callback = jest.fn();
      options.origin('https://allowed.example', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('rejects disallowed origins', () => {
      const options = createCorsOptions({ allowedOrigins: [] });
      const callback = jest.fn();

      options.origin('https://blocked.example', callback);

      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
