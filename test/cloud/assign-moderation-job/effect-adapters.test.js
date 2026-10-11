import { describe, expect, jest, test } from '@jest/globals';
import {
  createSetModeratorAssignment,
  initializeFirebaseApp,
  useMiddleware,
} from '../../../src/cloud/assign-moderation-job/effect-adapters.js';

describe('assign-moderation-job effect adapters', () => {
  test('uses the permission-aware seam to register middleware', () => {
    const allowEffects =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ (
        /** @type {unknown} */ (Object.freeze({}))
      );
    const app = { use: jest.fn() };
    const middleware = jest.fn();

    useMiddleware(allowEffects, app, middleware);

    expect(app.use).toHaveBeenCalledTimes(1);
    expect(app.use).toHaveBeenCalledWith(middleware);
  });

  test('uses the permission-aware seam to initialize Firebase Admin', () => {
    const allowEffects =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ (
        /** @type {unknown} */ (Object.freeze({}))
      );
    const initializer = jest.fn(() => 'initialized');

    expect(initializeFirebaseApp(allowEffects, initializer)).toBe(
      'initialized'
    );
    expect(initializer).toHaveBeenCalledTimes(1);
  });

  test('creates an AllowEffects-gated moderator assignment writer', async () => {
    const permission =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ (
        /** @type {unknown} */ (Object.freeze({}))
      );
    const set = jest.fn().mockResolvedValue('written');
    const doc = jest.fn(() => ({ set }));
    const collection = jest.fn(() => ({ doc }));
    const database =
      /** @type {import('firebase-admin/firestore').Firestore} */ (
        /** @type {unknown} */ ({ collection })
      );
    const writeAssignment = createSetModeratorAssignment(database);

    await expect(
      writeAssignment(permission, 'moderator-1', { variant: 'variants/one' })
    ).resolves.toBe('written');

    expect(collection).toHaveBeenCalledWith('moderators');
    expect(doc).toHaveBeenCalledWith('moderator-1');
    expect(set).toHaveBeenCalledWith(
      { variant: 'variants/one' },
      { merge: true }
    );
  });
});
