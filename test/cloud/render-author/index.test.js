import { expect, jest, test } from '@jest/globals';

test('scopes Firebase startup and trigger registration permission away from invocations', async () => {
  const ensureFirebaseApp = jest.fn();
  const getFirestoreInstance = jest.fn(() => db);
  const db = {
    collectionGroup: jest.fn(() => ({
      where: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      })),
    })),
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          data: () => ({ moderatorReputation: 0.5 }),
        }),
      })),
    })),
  };
  const saveAuthorHtml = jest.fn().mockResolvedValue(undefined);
  const updateAuthorDocument = jest.fn().mockResolvedValue(undefined);
  const startupPermissions = [];
  const invocationPermissions = [];
  let registeredHandler;
  const registerAuthorWriteTrigger = jest.fn((permission, options) => {
    startupPermissions.push(permission);
    registeredHandler = options.handler;
    return options.handler;
  });
  const Storage = jest.fn(() => ({ bucket: jest.fn(() => ({})) }));
  const bindEffectBoundary = handler => {
    const permission = Object.freeze({
      invocation: invocationPermissions.length,
    });
    invocationPermissions.push(permission);
    return handler(permission);
  };
  const FieldValue = { delete: jest.fn(() => 'delete-field') };
  let mod;

  await jest.isolateModulesAsync(async () => {
    await jest.unstable_mockModule(
      '../../../src/cloud/render-author/render-author-gcf.js',
      () => ({
        Storage,
        FieldValue,
        functions: {},
        ensureFirebaseApp,
        getFirestoreInstance,
        saveAuthorHtml,
        updateAuthorDocument,
        bindEffectBoundary,
      })
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/render-author/startup-effect-adapter.js',
      () => ({
        initializeFirebaseApp: (permission, ensure) => {
          startupPermissions.push(permission);
          ensure(permission);
        },
      })
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/render-author/trigger-effect-adapter.js',
      () => ({ registerAuthorWriteTrigger })
    );
    mod = await import('../../../src/cloud/render-author/index.js');
  });

  expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);
  expect(getFirestoreInstance).toHaveBeenCalledTimes(1);
  expect(getFirestoreInstance.mock.calls[0][1]).toEqual({
    ensureAppFn: expect.any(Function),
  });
  getFirestoreInstance.mock.calls[0][1].ensureAppFn(
    getFirestoreInstance.mock.calls[0][0]
  );
  expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);
  expect(registerAuthorWriteTrigger).toHaveBeenCalledTimes(1);
  expect(startupPermissions).toHaveLength(2);
  expect(startupPermissions[0]).toBe(startupPermissions[1]);
  expect(Object.isFrozen(startupPermissions[0])).toBe(true);
  expect(mod.handle).toBe(registeredHandler);

  const change = {
    after: {
      exists: true,
      data: () => ({ uuid: 'author-id', dirty: true }),
      ref: { id: 'author-id' },
    },
  };
  await registeredHandler(change);
  await registeredHandler(change);

  expect(invocationPermissions).toHaveLength(2);
  expect(invocationPermissions[0]).not.toBe(invocationPermissions[1]);
  expect(invocationPermissions[0]).not.toBe(startupPermissions[0]);
  expect(saveAuthorHtml.mock.calls.map(call => call[0])).toEqual(
    invocationPermissions
  );
  expect(updateAuthorDocument.mock.calls.map(call => call[0])).toEqual(
    invocationPermissions
  );
});
