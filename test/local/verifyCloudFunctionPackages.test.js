import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import { main } from '../../src/local/verify-cloud-function-packages.js';

const temporaryRoots = [];

afterEach(() => {
  temporaryRoots
    .splice(0)
    .forEach(root => fs.rmSync(root, { force: true, recursive: true }));
});

describe('verify Cloud Function packages command', () => {
  test.each([
    undefined,
    {},
    { rootDirectory: undefined, fileSystem: undefined, writeLine: undefined },
  ])('uses command defaults for %p', async options => {
    const root = createWorkspace({
      'infra/function.tf':
        'source_dir = "${path.module}/cloud-functions/probe"',
      'infra/cloud-functions/probe/package.json': '{"dependencies":{}}',
      'infra/cloud-functions/probe/index.js': 'export const ready = true;',
    });
    const originalDirectory = process.cwd();
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    try {
      process.chdir(root);
      await expect(main(options)).resolves.toBe(0);
      expect(log).toHaveBeenCalledWith(
        expect.stringMatching(/Verified 1 Terraform Cloud Function packages/)
      );
    } finally {
      process.chdir(originalDirectory);
      log.mockRestore();
    }
  });

  test('checks each Terraform archive package and reports a summary', async () => {
    const root = createWorkspace({
      'infra/function.tf':
        'source_dir = "${path.module}/cloud-functions/probe"',
      'infra/cloud-functions/probe/package.json': '{"dependencies":{}}',
      'infra/cloud-functions/probe/index.js': 'export const ready = true;',
    });
    const lines = [];

    await expect(
      main({ rootDirectory: root, writeLine: line => lines.push(line) })
    ).resolves.toBe(0);
    expect(lines[0]).toMatch(/Verified 1 Terraform Cloud Function packages/);
  });

  test('fails when Terraform references no Cloud Function package directories', async () => {
    const root = createWorkspace({
      'infra/variables.tf': 'variable "region" {}',
      'infra/ignored.txt':
        'source_dir = "${path.module}/cloud-functions/probe"',
    });
    const lines = [];

    await expect(
      main({ rootDirectory: root, writeLine: line => lines.push(line) })
    ).resolves.toBe(1);
    expect(lines).toEqual([
      'No Terraform Cloud Function archive directories were found.',
    ]);
  });

  test('prints package issues without a module specifier', async () => {
    const root = createWorkspace({
      'infra/function.tf':
        'source_dir = "${path.module}/cloud-functions/probe"',
      'infra/cloud-functions/probe/index.js': 'export const ready = true;',
    });
    const lines = [];

    await expect(
      main({ rootDirectory: root, writeLine: line => lines.push(line) })
    ).resolves.toBe(1);
    expect(lines).toContain('probe/package.json : missing package manifest');
  });

  test('prints package issues and fails for a missing generated module', async () => {
    const root = createWorkspace({
      'infra/function.tf':
        'source_dir = "${path.module}/cloud-functions/probe"',
      'infra/cloud-functions/probe/package.json': '{"dependencies":{}}',
      'infra/cloud-functions/probe/index.js': "import './missing.js';",
    });
    const lines = [];

    await expect(
      main({ rootDirectory: root, writeLine: line => lines.push(line) })
    ).resolves.toBe(1);
    expect(lines).toContain(
      'probe/index.js ./missing.js: relative import is missing from package'
    );
    expect(lines.at(-1)).toBe('Cloud package verification found 1 issue(s).');
  });
});

/**
 * Create a temporary Terraform workspace fixture.
 * @param {Record<string, string>} files Workspace files.
 * @returns {string} Fixture root.
 */
function createWorkspace(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-package-command-'));
  temporaryRoots.push(root);
  Object.entries(files).forEach(([relativePath, content]) => {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  });
  return root;
}
