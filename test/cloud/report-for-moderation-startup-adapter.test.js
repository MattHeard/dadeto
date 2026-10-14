import { jest } from '@jest/globals';
import { createReportModerationStartup } from '../../src/cloud/report-for-moderation/startup-effect-adapter.js';

test('initializes and resolves Firestore within startup capability scope', () => {
  const ensureFirebaseApp = jest.fn();
  const db = {};
  const getFirestoreInstance = jest.fn(() => db);
  const createEntrypoint = jest.fn((permission, deps) => ({
    permission,
    db: deps.db,
  }));

  const result = createReportModerationStartup({
    ensureFirebaseApp,
    getFirestoreInstance,
    createEntrypoint,
  });

  expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);
  expect(getFirestoreInstance).toHaveBeenCalledWith(result.permission, {
    ensureAppFn: expect.any(Function),
  });
  expect(result.db).toBe(db);
  expect(Object.isFrozen(result.permission)).toBe(true);
});
