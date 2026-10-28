import { jest } from '@jest/globals';
import * as nativeFiles from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const mkdtemp = jest.fn(async () => '/controlled-storage-root');
await jest.unstable_mockModule('node:fs/promises', () => ({
  ...nativeFiles,
  mkdtemp,
}));
const { createLocalGcpSimulator } = await import(
  '../../../../src/core/local/gcp-simulator/simulator.js'
);

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

beforeEach(() => mkdtemp.mockClear());

test('rejects a missing storage provider before allocating a directory', async () => {
  await expect(createLocalGcpSimulator(options())).rejects.toThrow(
    'createStorage must be provided'
  );
  expect(mkdtemp).not.toHaveBeenCalled();
});

test('passes the allocated root directly to the injected constructor', async () => {
  const failure = new Error('controlled constructor failure');
  const createStorage = jest.fn(() => {
    throw failure;
  });
  await expect(
    createLocalGcpSimulator({ ...options(), createStorage })
  ).rejects.toBe(failure);
  expect(mkdtemp).toHaveBeenCalledWith(
    path.join(os.tmpdir(), 'dadeto-gcp-sim-')
  );
  expect(createStorage.mock.calls).toEqual([['/controlled-storage-root']]);
});
