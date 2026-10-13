import { jest } from '@jest/globals';

test('entrypoint initializes at startup and uses a fresh trigger capability', async () => {
  const startupPermission = Object.freeze({ startup: true });
  const invocationPermission = Object.freeze({ invocation: true });
  const environment = { DENDRITE_ENVIRONMENT: 'test' };
  const db = { database: true };
  const snapshot = { snapshot: true };
  const initializeApp = jest.fn();
  const ensureFirebaseApp = jest.fn();
  const createFirebaseAppManager = jest.fn(() => ({ ensureFirebaseApp }));
  const getFirestoreInstance = jest.fn(() => db);
  const getEnvironmentVariables = jest.fn(() => environment);
  const render = jest.fn().mockResolvedValue(undefined);
  const createRenderContentsEntrypoint = jest.fn(() => ({ render }));
  const createUpdateVariantVisibilityHandler = jest.fn(
    options => async (permission, triggerSnapshot) => {
      await options.renderContents(permission, triggerSnapshot);
      return null;
    }
  );
  const onCreate = jest.fn(handler => handler);
  const document = jest.fn(() => ({ onCreate }));
  const functions = {
    region: jest.fn(() => ({ firestore: { document } })),
  };
  const renderContentsTriggers = jest.fn();
  let module;

  await jest.isolateModulesAsync(async () => {
    await jest.unstable_mockModule('firebase-admin/app', () => ({
      initializeApp,
    }));
    await jest.unstable_mockModule(
      '../../../src/cloud/update-variant-visibility/update-variant-visibility-gcf.js',
      () => ({
        functions,
        Storage: class Storage {},
        getAuth: jest.fn(() => ({})),
        createFirebaseAppManager,
        getFirestoreInstance,
        ADMIN_UID: 'admin',
        crypto: { randomUUID: jest.fn() },
        getEnvironmentVariables,
      })
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/allow-effects.js',
      () => ({
        createEffectStartupBoundary: handler => handler(startupPermission),
        createEffectInvocationBoundary:
          handler =>
          (...args) =>
            handler(invocationPermission, ...args),
      })
    );
    await jest.unstable_mockModule(
      '../../../src/core/cloud/render-contents/index.js',
      () => ({ createRenderContentsEntrypoint })
    );
    await jest.unstable_mockModule(
      '../../../src/core/cloud/update-variant-visibility/update-variant-visibility-core.js',
      () => ({ createUpdateVariantVisibilityHandler })
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/render-contents/render-contents-gcf.js',
      () => ({
        bindEffectBoundary: jest.fn(),
        createSaveRenderedPage: jest.fn(),
        effectFetchFn: jest.fn(),
        fetchFn: jest.fn(),
      })
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/render-contents/response-effects.js',
      () => ({
        logRenderContentsError: jest.fn(),
        sendHttpResponse: jest.fn(),
        setHttpResponseHeader: jest.fn(),
      })
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/render-contents/trigger-effect-adapters.js',
      () => ({ registerRenderContentsTriggers: renderContentsTriggers })
    );
    module = await import(
      '../../../src/cloud/update-variant-visibility/index.js'
    );
  });

  expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);
  expect(initializeApp).not.toHaveBeenCalled();
  const firestoreOptions = getFirestoreInstance.mock.calls[0][0];
  expect(firestoreOptions.environment).toBe(environment);
  firestoreOptions.ensureAppFn();
  expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);

  const renderEntryArgs = createRenderContentsEntrypoint.mock.calls[0];
  expect(renderEntryArgs[0]).toBe(startupPermission);
  expect(renderEntryArgs[1].db).toBe(db);
  expect(renderEntryArgs[1].registerRenderContentsTriggers).toBe(
    renderContentsTriggers
  );
  expect(functions.region).toHaveBeenCalledWith('europe-west1');
  expect(document).toHaveBeenCalledWith('moderationRatings/{ratingId}');

  await module.handle(snapshot);

  expect(render).toHaveBeenCalledWith(invocationPermission, snapshot);
  expect(render).not.toHaveBeenCalledWith(startupPermission, snapshot);
});
