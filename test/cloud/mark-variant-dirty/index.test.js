import { expect, it, jest } from '@jest/globals';

it('wires the request write and response adapters into endpoint composition', async () => {
  const adapters = {
    initializeFirebaseApp: jest.fn(),
    registerPostRoute: jest.fn(),
    updateDocument: jest.fn(),
    useMiddleware: jest.fn(),
  };
  const sendHttpResponse = jest.fn();
  const logWarning = jest.fn();
  const runMarkVariantDirty = jest.fn(() => ({
    markVariantDirty: {},
    handleRequest: jest.fn(),
  }));

  await jest.isolateModulesAsync(async () => {
    await jest.unstable_mockModule('firebase-admin/app', () => ({
      initializeApp: jest.fn(),
    }));
    await jest.unstable_mockModule(
      '../../../src/cloud/mark-variant-dirty/mark-variant-dirty-gcf.js',
      () => ({
        ADMIN_UID: 'admin',
        createFirebaseAppManager: jest.fn(),
        cors: jest.fn(),
        express: Object.assign(jest.fn(), { json: jest.fn() }),
        functions: {},
        getAuth: jest.fn(),
        getEnvironmentVariables: jest.fn(),
        getFirestoreInstance: jest.fn(),
      })
    );
    await jest.unstable_mockModule(
      '../../../src/core/cloud/mark-variant-dirty/run.js',
      () => ({ runMarkVariantDirty })
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/allow-effects.js',
      () => ({
        createEffectInvocationBoundary: jest.fn(),
        createEffectStartupBoundary: jest.fn(),
        logDebugEffect: jest.fn(),
      })
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/mark-variant-dirty/effect-adapters.js',
      () => adapters
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/mark-variant-dirty/response-adapter.js',
      () => ({ sendHttpResponse })
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/mark-variant-dirty/logging-adapter.js',
      () => ({ logWarning })
    );

    await import('../../../src/cloud/mark-variant-dirty/index.js');
  });

  expect(runMarkVariantDirty).toHaveBeenCalledWith(
    expect.objectContaining({
      sendResponse: sendHttpResponse,
      updateDocument: adapters.updateDocument,
      logWarning,
    })
  );
});
