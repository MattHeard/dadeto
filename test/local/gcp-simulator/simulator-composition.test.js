import { jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';

const permissions = [];
const bindEffectBoundary = jest.fn(async handler => {
  const permission = createAllowEffects();
  permissions.push(permission);
  return handler(permission);
});
const bindEffectResponder = jest.fn(handler => handler);
await jest.unstable_mockModule('../../../src/local/allow-effects.js', () => ({
  bindEffectBoundary,
  bindEffectResponder,
}));
const coreConstructor = jest.fn();
await jest.unstable_mockModule(
  '../../../src/core/local/gcp-simulator/simulator.js',
  () => ({
    createLocalGcpSimulator: coreConstructor,
  })
);
const platform = {
  publicDir: 'native-default',
  env: {},
  createStorageRoot: jest.fn(),
  clearStorageRoot: jest.fn(),
};
const createSimulatorPlatform = jest.fn(() => platform);
await jest.unstable_mockModule(
  '../../../src/local/gcp-simulator/simulator-platform.js',
  () => ({ createSimulatorPlatform })
);
const { createLocalGcpSimulator } = await import(
  '../../../src/local/gcp-simulator/simulator.js'
);

beforeEach(() => {
  permissions.length = 0;
  bindEffectBoundary.mockClear();
  bindEffectResponder.mockClear();
  coreConstructor.mockReset();
  createSimulatorPlatform.mockClear();
});

test('startup forwards its token/platform/options and each external clear has a fresh boundary', async () => {
  const clear = jest.fn(async () => {});
  const routes = { submitNewStory: jest.fn(), submitNewPage: jest.fn() };
  coreConstructor.mockResolvedValue({ clear, routes });
  expect(createSimulatorPlatform).not.toHaveBeenCalled();
  const options = {
    publicDir: 'explicit-public',
    bucketName: 'explicit-bucket',
  };
  const simulator = await createLocalGcpSimulator(options);
  expect(createSimulatorPlatform).toHaveBeenCalledTimes(1);
  expect(coreConstructor.mock.calls).toEqual([
    [permissions[0], platform, expect.objectContaining(options)],
  ]);
  expect(clear).not.toHaveBeenCalled();
  await expect(simulator.clear()).resolves.toBeUndefined();
  await simulator.clear();
  expect(permissions).toHaveLength(3);
  expect(new Set(permissions).size).toBe(3);
  expect(clear.mock.calls).toEqual([[permissions[1]], [permissions[2]]]);
  expect(bindEffectResponder.mock.calls).toEqual([
    [routes.submitNewStory],
    [routes.submitNewPage],
  ]);
});

test('constructor and cleanup errors preserve their original identity', async () => {
  const startupFailure = new Error('startup failed');
  coreConstructor.mockRejectedValueOnce(startupFailure);
  await expect(createLocalGcpSimulator()).rejects.toBe(startupFailure);
  const cleanupFailure = new Error('cleanup failed');
  const clear = jest.fn(async () => {
    throw cleanupFailure;
  });
  coreConstructor.mockResolvedValueOnce({
    clear,
    routes: { submitNewStory: jest.fn(), submitNewPage: jest.fn() },
  });
  const simulator = await createLocalGcpSimulator(undefined);
  await expect(simulator.clear()).rejects.toBe(cleanupFailure);
  expect(clear.mock.calls).toEqual([[permissions[2]]]);
});
