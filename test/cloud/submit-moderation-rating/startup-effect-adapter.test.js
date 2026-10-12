import { jest } from '@jest/globals';
import { createSubmitModerationRatingStartup } from '../../../src/cloud/submit-moderation-rating/startup-effect-adapter.js';

describe('createSubmitModerationRatingStartup', () => {
  test('initializes before getting Firestore without retaining startup permission', () => {
    const order = [];
    const ensureFirebaseApp = jest.fn(() => order.push('initialize'));
    const db = {};
    const getFirestoreInstance = jest.fn(options => {
      order.push('firestore');
      expect(options.ensureAppFn()).toBeUndefined();
      return db;
    });
    const createEntrypoint = jest.fn((_permission, dependencies) => {
      order.push('entrypoint');
      return { db: dependencies.db };
    });
    const startup = createSubmitModerationRatingStartup({
      ensureFirebaseApp,
      getFirestoreInstance,
      createEntrypoint,
    });

    expect(order).toEqual(['initialize', 'firestore', 'entrypoint']);
    expect(startup.db).toBe(db);
    expect(createEntrypoint.mock.calls[0][0]).toBeDefined();
  });
});
