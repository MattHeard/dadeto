import { jest } from '@jest/globals';
import { createFakeStorageClass } from '../../../../src/core/local/gcp-simulator/fake-storage.js';

/**
 * Create storage without a native filesystem, path implementation or Buffer.
 * @param {string} [name] Independent adapter identity.
 * @returns {object} Controlled adapters and storage handles.
 */
function fixture(name = 'case') {
  const bytes = new Uint8Array([1, 2, 3]);
  const permissions = [];
  const events = [];
  const fileSystem = {
    mkdir: jest.fn(async (...args) => {
      events.push(['mkdir', ...args]);
    }),
    writeFile: jest.fn(async (...args) => {
      events.push(['write', ...args]);
    }),
    stat: jest.fn(async () => ({})),
    readFile: jest.fn(async () => bytes),
  };
  const paths = {
    join: jest.fn((...parts) => `${name}[${parts.join('|')}]`),
    dirname: jest.fn(value => `${name}-parent(${value})`),
  };
  const toBytes = jest.fn(content => {
    events.push(['convert', content]);
    return bytes;
  });
  const bindEffectBoundary = jest.fn(async handler => {
    const permission = Object.freeze({ name, invocation: permissions.length });
    permissions.push(permission);
    events.push(['boundary', permission]);
    return handler(permission);
  });
  const Storage = createFakeStorageClass({
    fileSystem,
    paths,
    toBytes,
    bindEffectBoundary,
  });
  const storage = new Storage({ rootDir: `${name}-root` });
  const bucket = storage.bucket('bucket');
  const file = bucket.file('nested/name.txt');
  return {
    storage,
    bucket,
    file,
    fileSystem,
    paths,
    toBytes,
    bindEffectBoundary,
    bytes,
    permissions,
    events,
  };
}

test('construction uses only the supplied paths and preserves handle metadata', () => {
  const f = fixture();
  expect(f.storage.rootDir).toBe('case-root');
  expect(f.bucket).toMatchObject({
    rootDir: 'case-root',
    name: 'bucket',
    bucketDir: 'case[case-root|bucket]',
  });
  expect(f.file).toMatchObject({
    bucketDir: f.bucket.bucketDir,
    filePath: 'nested/name.txt',
    absolutePath: 'case[case[case-root|bucket]|nested/name.txt]',
  });
  expect(f.paths.join.mock.calls).toEqual([
    ['case-root', 'bucket'],
    [f.bucket.bucketDir, 'nested/name.txt'],
  ]);
  expect(f.bindEffectBoundary).not.toHaveBeenCalled();
  expect(f.toBytes).not.toHaveBeenCalled();
  for (const query of Object.values(f.fileSystem))
    expect(query).not.toHaveBeenCalled();
});

test('each save binds one permission and forwards it to both ordered writes', async () => {
  const f = fixture();
  for (const content of ['hello', new Uint8Array([4, 5])]) {
    await expect(
      f.file.save(content, { metadata: { ignored: true } })
    ).resolves.toBeUndefined();
  }
  expect(f.permissions).toHaveLength(2);
  expect(f.permissions[0]).not.toBe(f.permissions[1]);
  expect(f.paths.dirname.mock.calls).toEqual([
    [f.file.absolutePath],
    [f.file.absolutePath],
  ]);
  expect(f.events).toEqual(
    f.permissions.flatMap((permission, index) => [
      ['boundary', permission],
      [
        'mkdir',
        permission,
        `case-parent(${f.file.absolutePath})`,
        { recursive: true },
      ],
      ['convert', index === 0 ? 'hello' : new Uint8Array([4, 5])],
      ['write', permission, f.file.absolutePath, f.bytes],
    ])
  );
});

test.each(['boundary', 'mkdir', 'convert', 'write'])(
  'propagates a %s failure without falsely completing later writes',
  async stage => {
    const f = fixture();
    const error = new Error(`${stage} unavailable`);
    if (stage === 'boundary') f.bindEffectBoundary.mockRejectedValue(error);
    if (stage === 'mkdir') f.fileSystem.mkdir.mockRejectedValue(error);
    if (stage === 'convert')
      f.toBytes.mockImplementation(() => {
        throw error;
      });
    if (stage === 'write') f.fileSystem.writeFile.mockRejectedValue(error);
    await expect(f.file.save('content')).rejects.toBe(error);
    if (stage === 'boundary') expect(f.fileSystem.mkdir).not.toHaveBeenCalled();
    if (stage === 'boundary' || stage === 'mkdir')
      expect(f.toBytes).not.toHaveBeenCalled();
    if (stage !== 'write')
      expect(f.fileSystem.writeFile).not.toHaveBeenCalled();
  }
);

test('exists and download query the injected absolute path without minting writes', async () => {
  const f = fixture();
  await expect(f.file.exists()).resolves.toEqual([true]);
  expect(f.fileSystem.stat).toHaveBeenCalledWith(f.file.absolutePath);
  const result = await f.file.download();
  expect(result).toHaveLength(1);
  expect(result[0]).toBe(f.bytes);
  expect(f.fileSystem.readFile).toHaveBeenCalledWith(f.file.absolutePath);
  f.fileSystem.stat.mockRejectedValue(new Error('permission denied'));
  await expect(f.file.exists()).resolves.toEqual([false]);
  const error = new Error('read unavailable');
  f.fileSystem.readFile.mockRejectedValue(error);
  await expect(f.file.download()).rejects.toBe(error);
  expect(f.bindEffectBoundary).not.toHaveBeenCalled();
  expect(f.toBytes).not.toHaveBeenCalled();
  expect(f.fileSystem.mkdir).not.toHaveBeenCalled();
  expect(f.fileSystem.writeFile).not.toHaveBeenCalled();
});

test('independent factories keep their own paths, bytes and permission scopes', async () => {
  const left = fixture('left');
  const right = fixture('right');
  await right.file.save('right');
  await left.file.save('left');
  expect(left.fileSystem.writeFile.mock.calls).toEqual([
    [left.permissions[0], left.file.absolutePath, left.bytes],
  ]);
  expect(right.fileSystem.writeFile.mock.calls).toEqual([
    [right.permissions[0], right.file.absolutePath, right.bytes],
  ]);
  expect(left.permissions[0]).not.toBe(right.permissions[0]);
  expect((await left.file.download())[0]).toBe(left.bytes);
  expect((await right.file.download())[0]).toBe(right.bytes);
});
