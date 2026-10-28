import path from 'node:path';
import { jest } from '@jest/globals';
import { createRunStrykerWorktreeHandle } from '../../../src/core/scripts/run-stryker-worktree-core.js';
import { completeWorktreeOperation } from '../../helpers/worktree-completion.js';

/**
 * Keep the invocation permission observable at every injected effect boundary.
 * @returns {object} Controlled dependencies and observations.
 */
function effectsFixture() {
  const permissions = [];
  let active;
  const assertPermission = permission => expect(permission).toBe(active);
  const fsModule = Object.fromEntries(
    ['mkdir', 'rm', 'cp', 'writeFile', 'appendFile'].map(method => [
      method,
      jest.fn(async permission => assertPermission(permission)),
    ])
  );
  fsModule.mkdtemp = jest.fn(async permission => {
    assertPermission(permission);
    return `/controlled/worktree-${permissions.length}`;
  });
  const once = jest.fn((permission, event, listener) => {
    assertPermission(permission);
    if (event === 'exit') listener(0);
  });
  const spawnImpl = jest.fn(permission => {
    assertPermission(permission);
    return { once };
  });
  const now = jest.fn(permission => {
    assertPermission(permission);
    return `clock-${permissions.length}`;
  });
  const log = jest.fn(assertPermission);
  const options = {
    pathModule: path,
    rootDir: '/controlled',
    processModule: { env: { STRYKER_CONCURRENCY: '3' } },
    fsModule,
    spawnImpl,
    now,
    log,
    bindEffectBoundary: jest.fn(async handler => {
      active = Object.freeze({ invocation: permissions.length });
      permissions.push(active);
      return handler(active);
    }),
  };
  return { options, permissions, once };
}

test('each invocation forwards its own permission to every effect', async () => {
  const { options, permissions, once } = effectsFixture();
  const handle = createRunStrykerWorktreeHandle(options);
  expect(options.bindEffectBoundary).not.toHaveBeenCalled();
  expect(options.spawnImpl).not.toHaveBeenCalled();
  for (const method of Object.values(options.fsModule))
    expect(method).not.toHaveBeenCalled();
  await completeWorktreeOperation(handle());
  await completeWorktreeOperation(handle());
  expect(permissions).toHaveLength(2);
  expect(permissions[0]).not.toBe(permissions[1]);
  for (const method of Object.values(options.fsModule)) {
    expect(
      method.mock.calls.some(([permission]) => permission === permissions[0])
    ).toBe(true);
    expect(
      method.mock.calls.some(([permission]) => permission === permissions[1])
    ).toBe(true);
  }
  expect(once.mock.calls.map(([, event]) => event)).toEqual(
    Array(8).fill(['error', 'exit']).flat()
  );
  expect(options.log.mock.calls.map(([permission]) => permission)).toEqual(
    permissions
  );
  const entries = options.fsModule.appendFile.mock.calls.map(([, , line]) =>
    JSON.parse(line)
  );
  expect(entries.map(entry => entry.timestamp)).toEqual([
    ...Array(12).fill('clock-1'),
    ...Array(12).fill('clock-2'),
  ]);
  expect(options.now).toHaveBeenCalledTimes(24);
});

test('injected environment configures the file and every child without host values', async () => {
  const { options } = effectsFixture();
  const before = process.env.STRYKER_CONCURRENCY;
  process.env.STRYKER_CONCURRENCY = '99';
  try {
    await completeWorktreeOperation(createRunStrykerWorktreeHandle(options)());
    expect(options.fsModule.writeFile.mock.calls[0][2]).toContain(
      'concurrency: 3'
    );
    expect(
      options.spawnImpl.mock.calls.map(
        ([, , , input]) => input.env.STRYKER_CONCURRENCY
      )
    ).toEqual(['3', '3', '3', '3']);
  } finally {
    if (before === undefined) delete process.env.STRYKER_CONCURRENCY;
    else process.env.STRYKER_CONCURRENCY = before;
  }
});

test('a rejected invocation boundary prevents all platform effects', async () => {
  const { options } = effectsFixture();
  const failure = new Error('boundary unavailable');
  options.bindEffectBoundary.mockRejectedValue(failure);
  await expect(createRunStrykerWorktreeHandle(options)()).rejects.toBe(failure);
  for (const method of Object.values(options.fsModule))
    expect(method).not.toHaveBeenCalled();
  expect(options.spawnImpl).not.toHaveBeenCalled();
  expect(options.now).not.toHaveBeenCalled();
  expect(options.log).not.toHaveBeenCalled();
});
