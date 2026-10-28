import { jest } from '@jest/globals';
import { createAllowEffects } from '../../../../src/cloud/allow-effects.js';
import { createLocalGcpSimulator } from '../../../../src/core/local/gcp-simulator/simulator.js';

const createStorageRoot = jest.fn(async () => '/controlled-storage-root');
const platform = {
  publicDir: 'virtual-public',
  env: {},
  createStorageRoot,
  clearStorageRoot: jest.fn(),
};
const permission = createAllowEffects();

/**
 * Provide all pre-existing boundary adapters without executing any of them.
 * @returns {object} Required simulator adapters.
 */
function options() {
  return {
    bindEffectBoundary: jest.fn(),
    createCreditEventEffectAdapters: jest.fn(),
    setFirestoreDocument: jest.fn(),
    updateFirestoreDocument: jest.fn(),
    createSubmissionBatch: jest.fn(),
  };
}

beforeEach(() => createStorageRoot.mockClear());

test('rejects a missing storage provider before allocating a directory', async () => {
  await expect(
    createLocalGcpSimulator(permission, platform, options())
  ).rejects.toThrow('createStorage must be provided');
  expect(createStorageRoot).not.toHaveBeenCalled();
});

test('passes the allocated root directly to the injected constructor', async () => {
  const failure = new Error('controlled constructor failure');
  const createStorage = jest.fn(() => {
    throw failure;
  });
  await expect(
    createLocalGcpSimulator(permission, platform, {
      ...options(),
      createStorage,
    })
  ).rejects.toBe(failure);
  expect(createStorageRoot.mock.calls).toEqual([[permission]]);
  expect(createStorage.mock.calls).toEqual([['/controlled-storage-root']]);
});
