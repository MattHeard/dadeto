import { jest } from '@jest/globals';
import { createCloudFunctionPackageVerifier } from '../../../src/core/local/cloud-function-package-closure.js';

/**
 * Create a verifier using non-native path syntax and an in-memory filesystem.
 * @param {string[]} imports Runtime imports in the entrypoint.
 * @returns {object} Controlled ports and path expectations.
 */
function fixture(imports = []) {
  const input = 'WORK~infra~cloud-functions~probe';
  const root = `PKG<${input}>`;
  const childPath = `${root}~./child.js`;
  const paths = {
    resolve: jest.fn((...parts) =>
      parts.length === 1 ? `PKG<${parts[0]}>` : parts.join('~')
    ),
    join: jest.fn((...parts) => parts.join('~')),
    basename: jest.fn(value => `ARCHIVE@${value}`),
    dirname: jest.fn(value => value.slice(0, value.lastIndexOf('~'))),
    relative: jest.fn((_root, value) => `REL@${value}`),
    sep: '~',
  };
  const files = {
    'WORK~infra~function.tf':
      'source_dir = "${path.module}/cloud-functions/probe"',
    [`${root}~package.json`]: '{}',
    [`${root}~index.js`]: 'entry-source',
    [childPath]: 'child-source',
  };
  const fileSystem = {
    existsSync: jest.fn(file => Object.hasOwn(files, file)),
    readdirSync: jest.fn(() => ['function.tf', 'ignored.tf.txt']),
    readFileSync: jest.fn((file, encoding) => {
      expect(encoding).toBe('utf8');
      if (!Object.hasOwn(files, file))
        throw new Error(`Unexpected query: ${file}`);
      return files[file];
    }),
    statSync: jest.fn(() => ({ isFile: () => true })),
  };
  const parseModule = jest.fn(source => ({
    type: 'Program',
    body:
      source === 'entry-source'
        ? imports.map(value => ({
            type: 'ImportDeclaration',
            source: { value },
          }))
        : [],
  }));
  return { input, root, childPath, paths, files, fileSystem, parseModule };
}

test('all resolution and reads use the supplied ports and builtin metadata', () => {
  const f = fixture([
    './child.js',
    'fixture-runtime',
    'node:fixture-runtime',
    'fs',
  ]);
  const verify = createCloudFunctionPackageVerifier(f.parseModule, f.paths, [
    'fixture-runtime',
  ]);
  expect(f.fileSystem.readFileSync).not.toHaveBeenCalled();
  const result = verify.inspectCloudFunctionPackage(f.input, f.fileSystem);
  expect(result).toEqual({
    packageName: `ARCHIVE@${f.root}`,
    moduleCount: 2,
    importCount: 4,
    issues: [
      {
        file: `REL@${f.root}~index.js`,
        specifier: 'fs',
        reason: 'external package fs is not declared',
      },
    ],
  });
  expect(f.paths.resolve.mock.calls).toEqual([
    [f.input],
    [f.root, './child.js'],
  ]);
  expect(f.paths.dirname).toHaveBeenCalledWith(`${f.root}~index.js`);
  expect(f.paths.basename).toHaveBeenCalledWith(f.root);
  expect(f.fileSystem.statSync).toHaveBeenCalledWith(f.childPath);
  expect(f.fileSystem.readFileSync.mock.calls).toEqual([
    [`${f.root}~package.json`, 'utf8'],
    [`${f.root}~index.js`, 'utf8'],
    [f.childPath, 'utf8'],
  ]);
  expect(f.parseModule.mock.calls).toEqual(
    ['entry-source', 'child-source'].map(source => [
      source,
      {
        allowHashBang: true,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    ])
  );
});

test('each factory keeps its builtin registry independent of the host and caller mutations', () => {
  const f = fixture(['fixture-runtime', 'node:fixture-runtime']);
  const names = ['fixture-runtime'];
  const accepts = createCloudFunctionPackageVerifier(
    f.parseModule,
    f.paths,
    names
  );
  const rejects = createCloudFunctionPackageVerifier(
    f.parseModule,
    f.paths,
    []
  );
  names.splice(0);
  expect(
    accepts.inspectCloudFunctionPackage(f.input, f.fileSystem).issues
  ).toEqual([]);
  expect(
    rejects.inspectCloudFunctionPackage(f.input, f.fileSystem).issues
  ).toEqual([
    {
      file: `REL@${f.root}~index.js`,
      specifier: 'node:fixture-runtime',
      reason: 'external package node:fixture-runtime is not declared',
    },
    {
      file: `REL@${f.root}~index.js`,
      specifier: 'fixture-runtime',
      reason: 'external package fixture-runtime is not declared',
    },
  ]);
});

test.each(['success', 'issues', 'no-archives'])(
  'main forwards its permission to every %s diagnostic',
  async kind => {
    const f = fixture(kind === 'issues' ? ['undeclared'] : []);
    if (kind === 'no-archives')
      f.files['WORK~infra~function.tf'] = 'variable "region" {}';
    const permission = Object.freeze({ kind });
    const writeLine = jest.fn();
    const verify = createCloudFunctionPackageVerifier(
      f.parseModule,
      f.paths,
      [],
      writeLine
    );
    const result = await verify.main(permission, {
      rootDirectory: 'WORK',
      fileSystem: f.fileSystem,
    });
    expect(result).toBe(kind === 'success' ? 0 : 1);
    expect(f.fileSystem.readdirSync).toHaveBeenCalledWith('WORK~infra');
    if (kind === 'success')
      expect(writeLine.mock.calls).toEqual([
        [
          permission,
          'Verified 1 Terraform Cloud Function packages, 1 reachable modules, and 0 imports.',
        ],
      ]);
    if (kind === 'issues')
      expect(writeLine.mock.calls).toEqual([
        [
          permission,
          `ARCHIVE@${f.root}/REL@${f.root}~index.js undeclared: external package undeclared is not declared`,
        ],
        [permission, 'Cloud package verification found 1 issue(s).'],
      ]);
    if (kind === 'no-archives')
      expect(writeLine.mock.calls).toEqual([
        [
          permission,
          'No Terraform Cloud Function archive directories were found.',
        ],
      ]);
    expect(
      f.fileSystem.readFileSync.mock.calls.some(([file]) =>
        file.endsWith('ignored.tf.txt')
      )
    ).toBe(false);
  }
);

test('a per-call writer overrides the default and preserves writer errors', async () => {
  const f = fixture();
  const defaultWriter = jest.fn();
  const writeLine = jest.fn();
  const verify = createCloudFunctionPackageVerifier(
    f.parseModule,
    f.paths,
    [],
    defaultWriter
  );
  const permission = Object.freeze({});
  const options = {
    rootDirectory: 'WORK',
    fileSystem: f.fileSystem,
    writeLine,
  };
  await expect(verify.main(permission, options)).resolves.toBe(0);
  expect(defaultWriter).not.toHaveBeenCalled();
  expect(writeLine).toHaveBeenCalledWith(
    permission,
    'Verified 1 Terraform Cloud Function packages, 1 reachable modules, and 0 imports.'
  );
  const error = new Error('writer unavailable');
  writeLine.mockImplementation(() => {
    throw error;
  });
  await expect(verify.main(permission, options)).rejects.toBe(error);
});
