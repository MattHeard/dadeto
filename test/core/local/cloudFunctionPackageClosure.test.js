import { builtinModules } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'acorn';
import {
  createCloudFunctionPackageVerifier as createVerifier,
  getCloudFunctionArchiveDirectories,
} from '../../../src/core/local/cloud-function-package-closure.js';

const permission = Object.freeze({});
const createCloudFunctionPackageVerifier = parseModule => {
  const verifier = createVerifier(parseModule, path, builtinModules);
  return {
    inspectCloudFunctionPackage: root =>
      verifier.inspectCloudFunctionPackage(root, fs),
    main: options => verifier.main(permission, { fileSystem: fs, ...options }),
  };
};

const temporaryRoots = [];
const { inspectCloudFunctionPackage } =
  createCloudFunctionPackageVerifier(parse);

afterEach(() => {
  temporaryRoots
    .splice(0)
    .forEach(root => fs.rmSync(root, { force: true, recursive: true }));
});

describe('Cloud Function package closure', () => {
  test('uses the default no-op writer when no packages are found', async () => {
    const root = makeTemporaryDirectory();
    fs.mkdirSync(path.join(root, 'infra'));
    const verifier = createCloudFunctionPackageVerifier(parse);

    await expect(verifier.main({ rootDirectory: root })).resolves.toBe(1);
  });

  test('extracts unique archive directories from Terraform configuration', () => {
    expect(
      getCloudFunctionArchiveDirectories([
        'source_dir = "${path.module}/cloud-functions/submit-new-story"',
        'source_dir = "${path.module}/cloud-functions/submit-new-story"',
        'source_dir = "${path.module}/cloud-functions/render-contents"',
        'source_dir = "${path.module}/other"',
      ])
    ).toEqual(['render-contents', 'submit-new-story']);
    expect(getCloudFunctionArchiveDirectories([])).toEqual([]);
  });

  test('accepts zero and repeated Terraform assignment whitespace', () => {
    expect(
      getCloudFunctionArchiveDirectories([
        'source_dir="${path.module}/cloud-functions/zero"',
        'source_dir  = \t "${path.module}/cloud-functions/many"',
      ])
    ).toEqual(['many', 'zero']);
  });

  test('traverses a named reexport', () => {
    const root = createPackage({
      'index.js': "export { value } from './named.js';",
      'named.js': 'export const value = 1;',
    });
    expect(inspectCloudFunctionPackage(root)).toEqual({
      packageName: path.basename(root),
      moduleCount: 2,
      importCount: 1,
      issues: [],
    });
  });

  test('a missing entrypoint reports no ghost module or parse issue', () => {
    const root = createPackage({});
    expect(inspectCloudFunctionPackage(root)).toEqual({
      packageName: path.basename(root),
      moduleCount: 0,
      importCount: 0,
      issues: [
        {
          file: 'index.js',
          specifier: null,
          reason: 'missing package entrypoint',
        },
      ],
    });
  });

  test('an import of the archive root is a directory rather than an escape', () => {
    const root = createPackage({ 'index.js': "import '.';" });
    expect(inspectCloudFunctionPackage(root)).toEqual({
      packageName: path.basename(root),
      moduleCount: 1,
      importCount: 1,
      issues: [
        {
          file: 'index.js',
          specifier: '.',
          reason: 'relative import does not resolve to a file',
        },
      ],
    });
  });

  test('handles manifests without dependency sections', () => {
    const packageRoot = createPackage({
      'package.json': '{}',
      'index.js': "import 'undeclared-helper';",
    });

    expect(inspectCloudFunctionPackage(packageRoot).issues).toContainEqual({
      file: 'index.js',
      specifier: 'undeclared-helper',
      reason: 'external package undeclared-helper is not declared',
    });
  });

  test('ignores null and non-object parser nodes and missing node types', () => {
    const packageRoot = createPackage({ 'index.js': 'export {};' });
    const verifier = createCloudFunctionPackageVerifier(() => ({
      type: 'Program',
      body: [null, 'unexpected-node', { type: null }],
    }));

    expect(verifier.inspectCloudFunctionPackage(packageRoot)).toEqual({
      packageName: path.basename(packageRoot),
      moduleCount: 1,
      importCount: 0,
      issues: [],
    });
  });

  test('resolves runtime imports, Node builtins, and declared scoped packages', () => {
    const packageRoot = createPackage({
      'package.json': JSON.stringify({
        dependencies: {
          '@google-cloud/storage': '7.17.2',
          express: '4.19.2',
        },
        optionalDependencies: { 'optional-helper': '1.0.0' },
        peerDependencies: { 'peer-helper': '1.0.0' },
      }),
      'index.js': [
        "import './core.js';",
        "export * from './core.js';",
        "import('./lazy.js');",
        "require('./required.cjs');",
        'import(1);',
        'require(2);',
      ].join('\n'),
      'core.js': [
        "import 'node:crypto';",
        "import 'path';",
        "import '@google-cloud/storage/subpath';",
        "import 'express/subpath';",
        "import 'optional-helper';",
        "import 'peer-helper';",
        'export const value = true;',
      ].join('\n'),
      'lazy.js': 'export const loaded = true;',
      'required.cjs': 'module.exports = true;',
    });

    expect(inspectCloudFunctionPackage(packageRoot)).toEqual({
      packageName: path.basename(packageRoot),
      moduleCount: 4,
      importCount: 10,
      issues: [],
    });
  });

  test.each([
    [
      'google-auth-status-asset-version.js',
      'core/cloud/render-contents/render-contents-core.js',
      "import '../../google-auth-status-asset-version.js';",
    ],
    [
      'submit-shared.js',
      'cloud/get-author-uuid-v2/core.js',
      "import '../../submit-shared.js';",
    ],
  ])('detects a missing generated %s dependency', (_name, importer, source) => {
    const packageRoot = createPackage({
      'index.js': `import './${importer}';`,
      [importer]: source,
    });

    const report = inspectCloudFunctionPackage(packageRoot);

    expect(report.issues).toContainEqual({
      file: importer,
      specifier: source.match(/['"]([^'"]+)['"]/)[1],
      reason: 'relative import is missing from package',
    });
  });

  test('rejects imports that escape the archive or resolve to directories', () => {
    const packageRoot = createPackage({
      'index.js': "import '../outside.js'; import './directory';",
      'directory/': '',
    });

    expect(inspectCloudFunctionPackage(packageRoot).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          specifier: '../outside.js',
          reason: 'relative import escapes package directory',
        }),
        expect.objectContaining({
          specifier: './directory',
          reason: 'relative import does not resolve to a file',
        }),
      ])
    );
  });

  test('rejects undeclared external packages', () => {
    const packageRoot = createPackage({
      'index.js': "import '@google-cloud/storage';",
    });

    expect(inspectCloudFunctionPackage(packageRoot).issues).toContainEqual({
      file: 'index.js',
      specifier: '@google-cloud/storage',
      reason: 'external package @google-cloud/storage is not declared',
    });
  });

  test('reports missing and invalid package manifests', () => {
    const missingManifest = makeTemporaryDirectory();
    fs.writeFileSync(path.join(missingManifest, 'index.js'), 'export {};');
    expect(inspectCloudFunctionPackage(missingManifest).issues[0].reason).toBe(
      'missing package manifest'
    );

    const invalidManifest = makeTemporaryDirectory();
    fs.writeFileSync(path.join(invalidManifest, 'package.json'), '{');
    expect(
      inspectCloudFunctionPackage(invalidManifest).issues[0].reason
    ).toMatch(/^invalid package manifest:/);
  });

  test('reports a missing entrypoint and invalid JavaScript', () => {
    const missingEntrypoint = createPackage({});
    expect(
      inspectCloudFunctionPackage(missingEntrypoint).issues
    ).toContainEqual(
      expect.objectContaining({
        file: 'index.js',
        reason: 'missing package entrypoint',
      })
    );

    const invalidJavaScript = createPackage({ 'index.js': 'export const = ;' });
    expect(
      inspectCloudFunctionPackage(invalidJavaScript).issues[0].reason
    ).toMatch(/^invalid JavaScript:/);
  });
});

/**
 * Create a temporary package fixture.
 * @param {Record<string, string>} files Package files.
 * @returns {string} Fixture root.
 */
function createPackage(files) {
  const root = makeTemporaryDirectory();
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ dependencies: {} })
  );
  Object.entries(files).forEach(([relativePath, content]) => {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (relativePath.endsWith('/')) {
      fs.mkdirSync(filePath, { recursive: true });
    } else {
      fs.writeFileSync(filePath, content);
    }
  });
  return root;
}

/**
 * Create and register a temporary directory for cleanup.
 * @returns {string} Temporary root.
 */
function makeTemporaryDirectory() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-package-closure-'));
  temporaryRoots.push(root);
  return root;
}
