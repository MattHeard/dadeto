import { jest } from '@jest/globals';
import { createAllowEffects } from '../../src/cloud/allow-effects.js';
import { createSubmitNewPageRuntime } from '../../src/cloud/submit-new-page/runtime.js';

test('initializes Firebase with the startup capability before resolving services', () => {
  const allowEffects = createAllowEffects();
  const db = { collection: jest.fn() };
  const auth = { verifyIdToken: jest.fn() };
  const initializeApp = jest.fn();
  const ensureFirebaseApp = jest.fn(initializeApp);
  const createFirebaseAppManager = jest.fn(() => ({ ensureFirebaseApp }));
  const ensureFirebaseInitialized = jest.fn((permission, ensure) => ensure());
  const createHandleSubmit = jest.fn(() => jest.fn());

  createSubmitNewPageRuntime(allowEffects, {
    createFirebaseAppManager,
    initializeApp,
    ensureFirebaseInitialized,
    getFirestoreInstance: jest.fn(() => db),
    getAuth: jest.fn(() => auth),
    createHandleSubmit,
    crypto: { randomUUID: jest.fn() },
    FieldValue: { serverTimestamp: jest.fn() },
    parseIncomingOption: jest.fn(),
    findExistingOption: jest.fn(),
    findExistingPage: jest.fn(),
  });

  expect(ensureFirebaseInitialized).toHaveBeenCalledWith(
    allowEffects,
    ensureFirebaseApp
  );
  expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);
  expect(initializeApp).toHaveBeenCalledTimes(1);
  expect(createHandleSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      verifyIdToken: expect.any(Function),
      saveSubmission: expect.any(Function),
    })
  );
});
