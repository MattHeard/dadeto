import { jest } from '@jest/globals';
import { createRenderContentsStartup } from '../../../src/cloud/render-contents/startup-effect-adapter.js';
import { registerRenderContentsTriggers } from '../../../src/cloud/render-contents/trigger-effect-adapters.js';

test('composes initialized Firestore inside the startup capability boundary', () => {
  const ensureFirebaseApp = jest.fn();
  const db = {};
  const createEntrypoint = jest.fn((permission, options) => ({
    ...options,
    startupAllowEffects: permission,
  }));
  const getFirestoreInstance = jest.fn(() => db);
  const registerTriggers = jest.fn();

  const entrypoint = createRenderContentsStartup({
    ensureFirebaseApp,
    getFirestoreInstance,
    createEntrypoint,
    registerTriggers,
  });

  expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);
  expect(getFirestoreInstance).toHaveBeenCalledWith({
    ensureAppFn: expect.any(Function),
  });
  expect(entrypoint.db).toBe(db);
  expect(entrypoint.startupAllowEffects).toEqual(expect.any(Object));
  expect(Object.isFrozen(entrypoint.startupAllowEffects)).toBe(true);
  expect(entrypoint.registerRenderContentsTriggers).toBe(registerTriggers);
  expect(createEntrypoint).toHaveBeenCalledTimes(1);
});

test('registers Firestore and HTTP functions behind the startup adapter', () => {
  const permission = Object.freeze({ startup: true });
  const onCreate = jest.fn(() => 'firestore-handle');
  const onRequest = jest.fn(() => 'http-handle');
  const functions = {
    region: jest.fn(() => ({
      firestore: { document: jest.fn(() => ({ onCreate })) },
      https: { onRequest },
    })),
  };
  const createHandler = jest.fn();
  const requestHandler = jest.fn();

  const registered = registerRenderContentsTriggers(
    permission,
    functions,
    createHandler,
    requestHandler
  );

  expect(functions.region).toHaveBeenCalledWith('europe-west1');
  expect(onCreate).toHaveBeenCalledWith(createHandler);
  expect(onRequest).toHaveBeenCalledWith(requestHandler);
  expect(registered).toEqual({
    handle: 'firestore-handle',
    handleTrigger: 'http-handle',
  });
});
