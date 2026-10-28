import { jest } from '@jest/globals';
import { createAllowEffects } from '../../../../src/cloud/allow-effects.js';

const createSearchHttpHandler = jest.fn(() => jest.fn());
await jest.unstable_mockModule(
  '../../../../src/core/object-minute-rental-search/search-http.js',
  () => ({ createSearchHttpHandler })
);
const { createLocalGcpSimulator } = await import(
  '../../../../src/core/local/gcp-simulator/simulator.js'
);

/** @returns {object} In-memory simulator dependencies. */
function fixture() {
  const save = jest.fn(async () => {});
  const createStorage = jest.fn(() => ({
    bucket: () => ({ file: () => ({ save }) }),
  }));
  const platform = {
    publicDir: 'virtual-default-public',
    randomUUID: jest.fn(() => 'abcdef01-2345-4678-8123-456789abcdef'),
    env: Object.freeze({
      SEARCH_RUNNER_ID: 'virtual-runner',
      SEARCH_ALLOWED_ORIGINS: ' https://one.example, ,https://two.example ',
    }),
    createStorageRoot: jest.fn(async () => 'virtual-storage-root'),
    clearStorageRoot: jest.fn(async () => {}),
  };
  const options = {
    createStorage,
    saveStorageFile: jest.fn(),
    bindEffectBoundary: async handler => handler(createAllowEffects()),
    setFirestoreDocument: jest.fn(),
    updateFirestoreDocument: jest.fn(),
    createSubmissionBatch: jest.fn(),
    createCreditEventEffectAdapters: db => ({
      runTransaction: (permission, update) => db.runTransaction(update),
      getTransactionDocument: (transaction, reference) =>
        transaction.get(reference),
      setTransactionDocument: (permission, transaction, reference, data) =>
        transaction.set(reference, data),
    }),
  };
  return { platform, options, save, createStorage };
}

beforeEach(() => createSearchHttpHandler.mockClear());

test('uses supplied host metadata and capabilities without requiring native paths or environment', async () => {
  const f = fixture();
  const startup = createAllowEffects();
  const cleanup = createAllowEffects();
  const simulator = await createLocalGcpSimulator(
    startup,
    f.platform,
    f.options
  );
  expect(simulator.publicDir).toBe('virtual-default-public');
  expect(simulator.storageRoot).toBe('virtual-storage-root');
  expect(f.platform.createStorageRoot.mock.calls).toEqual([[startup]]);
  expect(f.createStorage.mock.calls).toEqual([['virtual-storage-root']]);
  expect(f.save).toHaveBeenCalledTimes(3);
  const context = createSearchHttpHandler.mock.calls[0][0].context;
  expect(context.env).toBe(f.platform.env);
  expect(context.allowedOrigins).toEqual([
    'https://one.example',
    'https://two.example',
  ]);
  expect(f.platform.clearStorageRoot).not.toHaveBeenCalled();
  await simulator.clear(cleanup);
  expect(f.platform.clearStorageRoot.mock.calls).toEqual([
    [cleanup, 'virtual-storage-root'],
  ]);
});

test('preserves explicit public directories including empty string', async () => {
  for (const publicDir of ['chosen-public', '']) {
    const f = fixture();
    const permission = createAllowEffects();
    const simulator = await createLocalGcpSimulator(permission, f.platform, {
      ...f.options,
      publicDir,
    });
    expect(simulator.publicDir).toBe(publicDir);
    await simulator.clear(permission);
  }
});

test('author UUID creation uses the explicit lifetime provider once and preserves the stored UUID on repeat', async () => {
  const f = fixture();
  const permission = createAllowEffects();
  const simulator = await createLocalGcpSimulator(
    permission,
    f.platform,
    f.options
  );
  expect(f.platform.randomUUID).not.toHaveBeenCalled();
  const request = { headers: { authorization: 'Bearer local-admin-token' } };
  await expect(simulator.routes.getAuthorUuid(request)).resolves.toEqual({
    status: 200,
    body: { uuid: 'abcdef01-2345-4678-8123-456789abcdef' },
  });
  await expect(simulator.routes.getAuthorUuid(request)).resolves.toEqual({
    status: 200,
    body: { uuid: 'abcdef01-2345-4678-8123-456789abcdef' },
  });
  expect(f.platform.randomUUID.mock.calls).toEqual([[permission]]);
  await simulator.clear(permission);
});
