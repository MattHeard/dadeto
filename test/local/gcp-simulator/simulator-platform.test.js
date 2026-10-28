import { jest } from '@jest/globals';
import path from 'node:path';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';

const mkdtemp = jest.fn(async () => 'native-temp-root');
const rm = jest.fn(async () => {});
await jest.unstable_mockModule('node:fs/promises', () => ({ mkdtemp, rm }));
await jest.unstable_mockModule('node:os', () => ({
  default: { tmpdir: () => 'native-temp' },
}));
const { createSimulatorPlatform } = await import(
  '../../../src/local/gcp-simulator/simulator-platform.js'
);

beforeEach(() => {
  mkdtemp.mockClear();
  rm.mockClear();
});

test('captures default public path and an independent environment snapshot without allocating', () => {
  const previous = process.env.SEARCH_RUNNER_ID;
  try {
    process.env.SEARCH_RUNNER_ID = 'first-runner';
    const first = createSimulatorPlatform();
    process.env.SEARCH_RUNNER_ID = 'second-runner';
    const second = createSimulatorPlatform();
    expect(first.publicDir).toBe(path.resolve('public'));
    expect(first.env).not.toBe(process.env);
    expect(first.env.SEARCH_RUNNER_ID).toBe('first-runner');
    expect(second.env.SEARCH_RUNNER_ID).toBe('second-runner');
    expect(first.env).not.toBe(second.env);
    expect(mkdtemp).not.toHaveBeenCalled();
    expect(rm).not.toHaveBeenCalled();
  } finally {
    if (previous === undefined) delete process.env.SEARCH_RUNNER_ID;
    else process.env.SEARCH_RUNNER_ID = previous;
  }
});

test('allocates under the native temp root and removes the exact supplied directory with existing retries', async () => {
  const platform = createSimulatorPlatform();
  const permission = createAllowEffects();
  await expect(platform.createStorageRoot(permission)).resolves.toBe(
    'native-temp-root'
  );
  expect(mkdtemp.mock.calls).toEqual([
    [path.join('native-temp', 'dadeto-gcp-sim-')],
  ]);
  await expect(
    platform.clearStorageRoot(permission, 'specific-root')
  ).resolves.toBeUndefined();
  expect(rm.mock.calls).toEqual([
    [
      'specific-root',
      {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 50,
      },
    ],
  ]);
});

test('preserves filesystem allocation and cleanup failures', async () => {
  const platform = createSimulatorPlatform();
  const permission = createAllowEffects();
  const allocateFailure = new Error('native allocation failed');
  mkdtemp.mockRejectedValueOnce(allocateFailure);
  await expect(platform.createStorageRoot(permission)).rejects.toBe(
    allocateFailure
  );
  expect(rm).not.toHaveBeenCalled();
  const clearFailure = new Error('native clear failed');
  rm.mockRejectedValueOnce(clearFailure);
  await expect(
    platform.clearStorageRoot(permission, 'failed-root')
  ).rejects.toBe(clearFailure);
});
