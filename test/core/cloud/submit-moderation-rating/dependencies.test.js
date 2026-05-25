import { jest } from '@jest/globals';
import { createModerationRatingDependencies } from '../../../../src/core/cloud/submit-moderation-rating/dependencies.js';

describe('createModerationRatingDependencies', () => {
  const makeFieldValue = () => ({
    delete: jest.fn(() => 'DELETE_SENTINEL'),
    serverTimestamp: jest.fn(() => 'SERVER_TS'),
  });

  test('builds dependency wrappers and resolves moderator assignment object variant', async () => {
    const update = jest.fn();
    const get = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ variant: { path: 'variants/x' } }),
    });
    const moderatorRef = { get, update };
    const set = jest.fn();
    const ratingDoc = { set };
    const db = {
      collection: jest.fn(name =>
        name === 'moderators'
          ? { doc: jest.fn(() => moderatorRef) }
          : { doc: jest.fn(() => ratingDoc) }
      ),
      doc: jest.fn(),
    };
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'abc' }) };
    const crypto = { randomUUID: jest.fn(() => 'uuid-1') };
    const FieldValue = makeFieldValue();

    const deps = createModerationRatingDependencies({
      db,
      auth,
      FieldValue,
      crypto,
    });

    await expect(deps.verifyIdToken('token')).resolves.toEqual({ uid: 'abc' });
    const assignment = await deps.fetchModeratorAssignment('uid-1');
    expect(assignment.variantId).toBe('/variants/x');
    await assignment.clearAssignment();
    expect(update).toHaveBeenCalledWith({ variant: 'DELETE_SENTINEL' });

    await deps.recordModerationRating({
      id: 'id1',
      moderatorId: 'm',
      variantId: '/v',
      isApproved: true,
      ratedAt: 123,
    });
    expect(set).toHaveBeenCalledWith({
      moderatorId: 'm',
      variantId: '/v',
      isApproved: true,
      ratedAt: 123,
    });

    expect(deps.randomUUID()).toBe('uuid-1');
    expect(deps.getServerTimestamp()).toBe('SERVER_TS');
  });

  test('returns null when moderator snapshot missing or assignment missing', async () => {
    const emptyRef = { get: jest.fn().mockResolvedValue({ exists: false }) };
    const noVariantRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
    };
    const stringVariantRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ variant: 'variants/from-string' }),
      }),
    };
    const moderatorDoc = jest
      .fn()
      .mockReturnValueOnce(emptyRef)
      .mockReturnValueOnce(noVariantRef)
      .mockReturnValueOnce(stringVariantRef);
    const db = {
      collection: jest.fn(() => ({ doc: moderatorDoc })),
      doc: jest.fn(path => ({ path })),
    };
    const deps = createModerationRatingDependencies({
      db,
      auth: { verifyIdToken: jest.fn() },
      FieldValue: makeFieldValue(),
      crypto: { randomUUID: jest.fn() },
    });

    await expect(deps.fetchModeratorAssignment('u1')).resolves.toBeNull();
    await expect(deps.fetchModeratorAssignment('u2')).resolves.toBeNull();

    const assignment = await deps.fetchModeratorAssignment('u3');
    expect(assignment.variantId).toBe('/variants/from-string');
  });
  test('treats undefined moderator data as missing assignment', async () => {
    const db = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest
            .fn()
            .mockResolvedValue({ exists: true, data: () => undefined }),
        })),
      })),
      doc: jest.fn(),
    };
    const deps = createModerationRatingDependencies({
      db,
      auth: { verifyIdToken: jest.fn() },
      FieldValue: makeFieldValue(),
      crypto: { randomUUID: jest.fn() },
    });

    await expect(deps.fetchModeratorAssignment('u4')).resolves.toBeNull();
  });
});
