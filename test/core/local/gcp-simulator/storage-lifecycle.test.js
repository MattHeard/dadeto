import { jest } from '@jest/globals';
import { createSimulatorStorage } from '../../../../src/core/local/gcp-simulator/storage-lifecycle.js';
import { createAllowEffects } from '../../../../src/cloud/allow-effects.js';

test('allocation and each cleanup use their supplied permission and capture only the allocated root', async () => {
  const startup = createAllowEffects();
  const cleanup = createAllowEffects();
  const nextCleanup = createAllowEffects();
  const platform = {
    createStorageRoot: jest.fn(async () => 'virtual-root'),
    clearStorageRoot: jest.fn(async () => {}),
  };
  const resource = await createSimulatorStorage(startup, platform);
  expect(platform.createStorageRoot.mock.calls).toEqual([[startup]]);
  expect(resource.storageRoot).toBe('virtual-root');
  expect(platform.clearStorageRoot).not.toHaveBeenCalled();
  await expect(resource.clear(cleanup)).resolves.toBeUndefined();
  await resource.clear(nextCleanup);
  expect(platform.clearStorageRoot.mock.calls).toEqual([
    [cleanup, 'virtual-root'],
    [nextCleanup, 'virtual-root'],
  ]);
});

test('a rejected allocation returns no resource and does not invent cleanup', async () => {
  const failure = new Error('allocation unavailable');
  const permission = createAllowEffects();
  const platform = {
    createStorageRoot: jest.fn(async () => {
      throw failure;
    }),
    clearStorageRoot: jest.fn(),
  };
  await expect(createSimulatorStorage(permission, platform)).rejects.toBe(
    failure
  );
  expect(platform.createStorageRoot.mock.calls).toEqual([[permission]]);
  expect(platform.clearStorageRoot).not.toHaveBeenCalled();
});

test('cleanup propagates the original failure', async () => {
  const failure = new Error('cleanup unavailable');
  const permission = createAllowEffects();
  const platform = {
    createStorageRoot: jest.fn(async () => 'root-to-remove'),
    clearStorageRoot: jest.fn(async () => {
      throw failure;
    }),
  };
  const resource = await createSimulatorStorage(permission, platform);
  await expect(resource.clear(permission)).rejects.toBe(failure);
  expect(platform.clearStorageRoot.mock.calls).toEqual([
    [permission, 'root-to-remove'],
  ]);
});

test('concurrent allocations retain independent roots and cleanup permissions', async () => {
  let completeFirst;
  const platform = {
    createStorageRoot: jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            completeFirst = resolve;
          })
      )
      .mockResolvedValueOnce('second-root'),
    clearStorageRoot: jest.fn(async () => {}),
  };
  const a = createAllowEffects();
  const b = createAllowEffects();
  const one = createSimulatorStorage(a, platform);
  const second = await createSimulatorStorage(b, platform);
  expect(platform.createStorageRoot.mock.calls).toEqual([[a], [b]]);
  await second.clear(b);
  completeFirst('first-root');
  const first = await one;
  await first.clear(a);
  expect(first.storageRoot).toBe('first-root');
  expect(second.storageRoot).toBe('second-root');
  expect(platform.clearStorageRoot.mock.calls).toEqual([
    [b, 'second-root'],
    [a, 'first-root'],
  ]);
});
