import { expect, jest, test } from '@jest/globals';

test('scheduled executions mint distinct permissions for reputation writes', async () => {
  let scheduledHandler;
  const startupPermission = Object.freeze({ startup: true });
  const invocationPermissions = [];
  const initializationPermissions = [];
  const steps = [];
  const db = { collection: jest.fn() };
  const ensureFirebaseApp = jest.fn();
  const getFirestoreInstance = jest.fn((_permission, options) => {
    steps.push('firestore');
    options.ensureAppFn();
    return db;
  });
  const fetchModerationRatings = jest.fn(async () => {
    steps.push('fetch');
    return [];
  });
  const calculateModeratorReputations = jest.fn().mockReturnValue([]);
  const writeModeratorReputations = jest.fn(async () => steps.push('write'));
  const functions = {
    region: jest.fn(() => ({
      pubsub: {
        schedule: jest.fn(() => ({ onRun: jest.fn() })),
      },
    })),
  };
  const registerSchedule = jest.fn((permission, _functions, handler) => {
    scheduledHandler = handler;
    return 'registered-schedule';
  });
  const initializeFirebase = jest.fn((permission, ensure) => {
    initializationPermissions.push(permission);
    steps.push('initialize');
    ensure(permission);
  });
  const createEffectInvocationBoundary =
    handler =>
    async (...args) => {
      const permission = Object.freeze({
        invocation: invocationPermissions.length,
      });
      invocationPermissions.push(permission);
      return handler(permission, ...args);
    };

  await jest.isolateModulesAsync(async () => {
    await jest.unstable_mockModule(
      '../../../src/cloud/allow-effects.js',
      () => ({
        createEffectInvocationBoundary,
        createEffectStartupBoundary: handler => handler(startupPermission),
      })
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-gcf.js',
      () => ({ functions, ensureFirebaseApp, getFirestoreInstance })
    );
    await jest.unstable_mockModule(
      '../../../src/core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js',
      () => ({ calculateModeratorReputations, fetchModerationRatings })
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/recalculate-moderator-reputation/effect-adapters.js',
      () => ({ writeModeratorReputations })
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/recalculate-moderator-reputation/startup-effect-adapters.js',
      () => ({
        initializeModeratorReputationFirebase: initializeFirebase,
        registerModeratorReputationSchedule: registerSchedule,
      })
    );
    const { handle } = await import(
      '../../../src/cloud/recalculate-moderator-reputation/index.js'
    );
    expect(handle).toBe('registered-schedule');
  });

  await scheduledHandler();
  await scheduledHandler();

  const [firstPermission, secondPermission] = invocationPermissions;
  expect(registerSchedule).toHaveBeenCalledWith(
    startupPermission,
    functions,
    scheduledHandler
  );
  expect(initializationPermissions).toEqual(invocationPermissions);
  expect(getFirestoreInstance).toHaveBeenCalledTimes(2);
  expect(getFirestoreInstance).toHaveBeenCalledWith(expect.any(Object), {
    ensureAppFn: expect.any(Function),
  });
  expect(ensureFirebaseApp).toHaveBeenCalledTimes(2);
  expect(steps).toEqual([
    'initialize',
    'firestore',
    'fetch',
    'write',
    'initialize',
    'firestore',
    'fetch',
    'write',
  ]);
  expect(writeModeratorReputations.mock.calls[0][0]).toBe(firstPermission);
  expect(writeModeratorReputations.mock.calls[1][0]).toBe(secondPermission);
  expect(startupPermission).not.toBe(firstPermission);
  expect(startupPermission).not.toBe(secondPermission);
  expect(firstPermission).not.toBe(secondPermission);
  expect(Object.isFrozen(startupPermission)).toBe(true);
  expect(Object.isFrozen(firstPermission)).toBe(true);
  expect(Object.isFrozen(secondPermission)).toBe(true);
  expect(writeModeratorReputations).toHaveBeenCalledTimes(2);
  expect(fetchModerationRatings).toHaveBeenCalledWith(db);
});
