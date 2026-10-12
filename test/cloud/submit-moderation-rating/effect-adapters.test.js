import { jest } from '@jest/globals';
import { sendModerationRatingResponse } from '../../../src/cloud/submit-moderation-rating/effect-adapters.js';
import {
  initializeModerationRatingFirebase,
  updateModeratorAssignment,
  recordRating,
} from '../../../src/cloud/submit-moderation-rating/firestore-effect-adapters.js';

describe('submit-moderation-rating effect adapters', () => {
  const permission = {};

  test('initializes Firebase through an explicit effect adapter', () => {
    const ensureApp = jest.fn();
    initializeModerationRatingFirebase(permission, ensureApp);
    expect(ensureApp).toHaveBeenCalledTimes(1);
  });

  test('performs the assignment and rating writes through explicit adapters', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    await updateModeratorAssignment(permission, { update }, { variant: 'x' });
    expect(update).toHaveBeenCalledWith({ variant: 'x' });

    const set = jest.fn().mockResolvedValue(undefined);
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => ({ set })) })),
    };
    await recordRating(permission, db, {
      id: 'rating-1',
      moderatorId: 'moderator-1',
      variantId: 'variant-1',
      isApproved: true,
      ratedAt: 'timestamp',
    });
    expect(db.collection).toHaveBeenCalledWith('moderationRatings');
    expect(set).toHaveBeenCalledWith({
      moderatorId: 'moderator-1',
      variantId: 'variant-1',
      isApproved: true,
      ratedAt: 'timestamp',
    });
  });

  test('sends JSON and text responses through the response adapter', () => {
    const json = jest.fn();
    const send = jest.fn();
    const response = {
      status: jest.fn(() => ({ json, send })),
      sendStatus: jest.fn(),
    };
    sendModerationRatingResponse(permission, response, 201, { ok: true });
    sendModerationRatingResponse(permission, response, 400, 'invalid');
    expect(response.status).toHaveBeenNthCalledWith(1, 201);
    expect(json).toHaveBeenCalledWith({ ok: true });
    expect(response.status).toHaveBeenNthCalledWith(2, 400);
    expect(send).toHaveBeenCalledWith('invalid');
  });
});
