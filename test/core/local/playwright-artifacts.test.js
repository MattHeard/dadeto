import { jest } from '@jest/globals';
import path from 'node:path';
import { createPlaywrightArtifactUploader } from '../../../src/core/local/playwright-artifacts/playwright-artifacts.js';

const permission = Object.freeze({});
const secret = 'fixture-only-upload-secret';

/**
 * @param {object} [overrides] Dependency overrides.
 * @returns {object} In-memory report tree and permission-aware seams.
 */
function fixture(overrides = {}) {
  const files = {
    'playwright-report': ['index.html', 'data', 'empty'],
    'playwright-report/index.html': new Uint8Array([60, 104, 62]),
    'playwright-report/data': ['shot #1.png'],
    'playwright-report/data/shot #1.png': new Uint8Array([137, 80, 78, 71]),
    'playwright-report/empty': [],
    'test-results': ['record.json', 'trace.bin'],
    'test-results/record.json': new Uint8Array([123, 125]),
    'test-results/trace.bin': new Uint8Array([0, 255]),
    '/tmp/playwright.log': new Uint8Array([111, 107]),
    empty: [],
  };
  const fileSystem = {
    statFn: jest.fn((_permission, file) => {
      if (!(file in files)) throw new Error('missing source');
      return { isDirectory: () => Array.isArray(files[file]) };
    }),
    readDirFn: jest.fn((_permission, dir) => files[dir]),
    readFileFn: jest.fn((_permission, file) => files[file]),
  };
  const getAccessTokenFn = jest.fn(() => ` ${secret} `);
  const fetchFn = jest.fn(async () => ({ ok: true, status: 200 }));
  const dependencies = {
    fileSystem,
    pathModule: path.posix,
    getAccessTokenFn,
    fetchFn,
    ...overrides,
  };
  return {
    files,
    ...dependencies,
    handle: createPlaywrightArtifactUploader(dependencies),
  };
}

const options = {
  bucketName: 'reports-bucket',
  prefix: '/t-test/123/',
  paths: ['playwright-report', 'test-results', '/tmp/playwright.log'],
};

test('uploads recursive binary reports with only conditional object-creation POSTs', async () => {
  const f = fixture();
  await expect(f.handle(permission, options)).resolves.toBe(5);
  expect(f.getAccessTokenFn).toHaveBeenCalledTimes(1);
  expect(f.getAccessTokenFn).toHaveBeenCalledWith(permission);
  const requests = f.fetchFn.mock.calls.map(([capability, url, init]) => {
    expect(capability).toBe(permission);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(`Bearer ${secret}`);
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://storage.googleapis.com');
    expect(parsed.pathname).toBe('/upload/storage/v1/b/reports-bucket/o');
    expect(parsed.searchParams.get('uploadType')).toBe('media');
    expect(parsed.searchParams.get('ifGenerationMatch')).toBe('0');
    return { name: parsed.searchParams.get('name'), init };
  });
  expect(requests.map(({ name }) => name)).toEqual([
    't-test/123/playwright-report/index.html',
    't-test/123/playwright-report/data/shot #1.png',
    't-test/123/test-results/record.json',
    't-test/123/test-results/trace.bin',
    't-test/123/playwright.log',
  ]);
  expect(requests.map(({ init }) => init.headers['Content-Type'])).toEqual([
    'text/html; charset=utf-8',
    'image/png',
    'application/json',
    'application/octet-stream',
    'text/plain; charset=utf-8',
  ]);
  expect(requests[1].init.body).toBe(
    f.files['playwright-report/data/shot #1.png']
  );
  expect([...requests[3].init.body]).toEqual([0, 255]);
  for (const operation of Object.values(f.fileSystem)) {
    expect(
      operation.mock.calls.every(([capability]) => capability === permission)
    ).toBe(true);
  }
});

test('rejects missing targets or artifact selection before obtaining credentials', async () => {
  for (const invalid of [
    { ...options, bucketName: ' ' },
    { ...options, prefix: ' / ' },
    { ...options, paths: [] },
  ]) {
    const f = fixture();
    await expect(f.handle(permission, invalid)).rejects.toThrow();
    expect(f.getAccessTokenFn).not.toHaveBeenCalled();
    expect(f.fetchFn).not.toHaveBeenCalled();
  }
});

test('rejects empty required report directories and missing files', async () => {
  const f = fixture();
  await expect(
    f.handle(permission, { ...options, paths: ['empty'] })
  ).rejects.toThrow('artifact is empty');
  await expect(
    f.handle(permission, { ...options, paths: ['missing'] })
  ).rejects.toThrow('missing source');
  expect(f.fetchFn).not.toHaveBeenCalled();
});

test('redacts failed or empty credential acquisition', async () => {
  for (const getAccessTokenFn of [
    () => {
      throw new Error(secret);
    },
    () => '  ',
  ]) {
    const f = fixture({ getAccessTokenFn });
    await expect(f.handle(permission, options)).rejects.toThrow(
      'Could not obtain report upload credentials.'
    );
    expect(f.fetchFn).not.toHaveBeenCalled();
  }
});

test('reports transport failure without exposing token-bearing dependency errors', async () => {
  const f = fixture({
    fetchFn: jest.fn(async () => {
      throw new Error(secret);
    }),
  });
  await expect(f.handle(permission, options)).rejects.toThrow(
    'Cloud report transport failed: t-test/123/playwright-report/index.html'
  );
  expect(f.fetchFn).toHaveBeenCalledTimes(1);
});

test('fails closed on denied or already-existing objects without deleting or overwriting', async () => {
  for (const status of [403, 412]) {
    const f = fixture({
      fetchFn: jest.fn(async () => ({ ok: false, status })),
    });
    await expect(f.handle(permission, options)).rejects.toThrow(
      `Cloud report upload failed (HTTP ${status})`
    );
    expect(f.fetchFn).toHaveBeenCalledTimes(1);
    expect(f.fetchFn.mock.calls[0][2].method).toBe('POST');
  }
});
