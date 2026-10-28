import { jest } from '@jest/globals';
import { createSimulatorHandle } from '../../../../src/core/local/gcp-simulator/simulator-entrypoint.js';

const createSimulator = jest.fn();
const permission = Object.freeze({});
const bindEffectBoundary = jest.fn(async handler => handler(permission));
beforeEach(() => {
  createSimulator.mockReset();
  bindEffectBoundary.mockClear();
});

test('composition is lazy and applies explicit adapters after caller options', async () => {
  const createStorage = jest.fn();
  const defaults = { createStorage, bucketName: 'platform' };
  const handle = createSimulatorHandle(
    createSimulator,
    defaults,
    bindEffectBoundary
  );
  expect(createSimulator).not.toHaveBeenCalled();
  expect(bindEffectBoundary).not.toHaveBeenCalled();
  const result = { ready: true };
  createSimulator.mockResolvedValue(result);
  const options = {
    baseUrl: 'http://fixture',
    bucketName: 'caller',
    createStorage: jest.fn(),
  };
  await expect(handle(options)).resolves.toBe(result);
  expect(createSimulator.mock.calls).toEqual([
    [
      permission,
      {
        baseUrl: 'http://fixture',
        bucketName: 'platform',
        createStorage,
      },
    ],
  ]);
  expect(bindEffectBoundary).toHaveBeenCalledTimes(1);
  expect(options.bucketName).toBe('caller');
  expect(defaults).toEqual({ createStorage, bucketName: 'platform' });
});

test('omitted options preserve defaults and constructor errors', async () => {
  const createStorage = jest.fn();
  const handle = createSimulatorHandle(
    createSimulator,
    { createStorage },
    bindEffectBoundary
  );
  const error = new Error('constructor unavailable');
  createSimulator.mockRejectedValue(error);
  await expect(handle()).rejects.toBe(error);
  expect(createSimulator).toHaveBeenCalledWith(permission, { createStorage });
});

test('a rejected startup boundary prevents constructor effects', async () => {
  const error = new Error('boundary unavailable');
  const boundary = jest.fn(async () => {
    throw error;
  });
  const handle = createSimulatorHandle(createSimulator, {}, boundary);
  await expect(handle({ baseUrl: 'http://fixture' })).rejects.toBe(error);
  expect(createSimulator).not.toHaveBeenCalled();
});
