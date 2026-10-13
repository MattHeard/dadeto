import { jest } from '@jest/globals';
import { createUpdateVariantVisibilityStartup } from '../../../src/cloud/update-variant-visibility/startup-effect-adapter.js';

test('initializes Firestore and composes both handlers under startup permission without retaining it', async () => {
  const startupPermission = Object.freeze({ startup: true });
  const invocationPermission = Object.freeze({ invocation: true });
  const ensureFirebaseApp = jest.fn();
  const environment = { DENDRITE_ENVIRONMENT: 'test' };
  const db = { db: true };
  const render = jest.fn();
  const updateFirestoreDocument = jest.fn();
  const snapshot = { snapshot: true };
  const handler = jest.fn(async (permission, value) => {
    await render(permission, value);
    return null;
  });
  const registered = jest.fn();
  const getFirestoreInstance = jest.fn(() => db);
  const createRenderContentsEntrypoint = jest.fn((permission, dependencies) => {
    expect(permission).toBe(startupPermission);
    expect(dependencies.db).toBe(db);
    expect(dependencies.getEnvironmentVariables()).toBe(environment);
    return { render };
  });
  const registerTrigger = jest.fn((permission, _functions, trigger) => {
    expect(permission).toBe(startupPermission);
    registered.mockImplementation(trigger);
    return 'registered-trigger';
  });
  const bindInvocationBoundary = jest.fn(
    effectfulHandler => value => effectfulHandler(invocationPermission, value)
  );

  const result = createUpdateVariantVisibilityStartup(startupPermission, {
    ensureFirebaseApp: permission => {
      expect(permission).toBe(startupPermission);
      ensureFirebaseApp();
    },
    getFirestoreInstance,
    getEnvironmentVariables: () => environment,
    createRenderContentsEntrypoint,
    renderContentsDependencies: { registerRenderContentsTriggers: jest.fn() },
    createUpdateVariantVisibilityHandler: jest.fn(options => {
      expect(options).toEqual({
        db,
        renderContents: render,
        updateFirestoreDocument,
      });
      return handler;
    }),
    updateFirestoreDocument,
    bindInvocationBoundary,
    registerTrigger,
    functions: { functions: true },
  });

  expect(result).toBe('registered-trigger');
  expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);
  const firestoreOptions = getFirestoreInstance.mock.calls[0][0];
  expect(firestoreOptions.environment).toBe(environment);
  expect(firestoreOptions.ensureAppFn).toEqual(expect.any(Function));
  firestoreOptions.ensureAppFn();
  expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);

  await registered(snapshot);

  expect(handler).toHaveBeenCalledWith(invocationPermission, snapshot);
  expect(render).toHaveBeenCalledWith(invocationPermission, snapshot);
  expect(handler).not.toHaveBeenCalledWith(startupPermission, snapshot);
});
