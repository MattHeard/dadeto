import { executeCopyDendriteWorkflow } from '../../src/core/build/dendrite.js';

describe('executeCopyDendriteWorkflow', () => {
  const makePath = resolveCalls => ({
    resolve: (...parts) => {
      resolveCalls?.push(parts);
      return 'root';
    },
    dirname: value => value.replace(/\/[^/]*$/, ''),
    join: (...parts) => parts.join('/'),
  });

  it('skips both source trees when they are absent', () => {
    const logs = [];
    const resolveCalls = [];
    executeCopyDendriteWorkflow({
      console: { log: message => logs.push(message) },
      fs: {
        existsSync: () => false,
        mkdirSync: () => {
          throw new Error('mkdir should not run');
        },
        readdirSync: () => [],
        copyFileSync: () => {
          throw new Error('copy should not run');
        },
      },
      path: makePath(resolveCalls),
      fileURLToPath: () => 'root/src/core/dendrite.js',
      importMetaUrl: 'file:///ignored',
    });

    expect(logs).toHaveLength(4);
    expect(resolveCalls).toEqual([['root/src/core', '../../']]);
  });

  it('copies existing trees recursively and skips missing trees', () => {
    const logs = [];
    const copied = [];
    const made = [];
    const resolveCalls = [];
    const readCalls = [];
    const files = new Map([
      ['root/src/browser', [{ name: 'index.js', directory: false }]],
      ['root/src/browser/nested', [{ name: 'app.js', directory: false }]],
      ['root/src/core', [{ name: 'nested', directory: true }]],
      ['root/src/core/nested', [{ name: 'core.js', directory: false }]],
    ]);
    const fs = {
      existsSync: path => files.has(path),
      mkdirSync: (path, options) => made.push({ path, options }),
      readdirSync: (path, options) => {
        readCalls.push({ path, options });
        return files.get(path).map(entry => ({
          name: entry.name,
          isDirectory: () => entry.directory,
        }));
      },
      copyFileSync: (source, destination) =>
        copied.push({ source, destination }),
    };
    executeCopyDendriteWorkflow({
      console: { log: message => logs.push(message) },
      fs,
      path: makePath(resolveCalls),
      fileURLToPath: () => 'root/src/core/dendrite.js',
      importMetaUrl: 'file:///ignored',
    });

    expect(made).toEqual([
      { path: 'root/infra/browser', options: { recursive: true } },
      { path: 'root/infra/core', options: { recursive: true } },
      { path: 'root/infra/core/nested', options: { recursive: true } },
    ]);
    expect(resolveCalls).toEqual([['root/src/core', '../../']]);
    expect(readCalls).toEqual([
      { path: 'root/src/browser', options: { withFileTypes: true } },
      { path: 'root/src/core', options: { withFileTypes: true } },
      { path: 'root/src/core/nested', options: { withFileTypes: true } },
    ]);
    expect(copied).toEqual([
      {
        source: 'root/src/browser/index.js',
        destination: 'root/infra/browser/index.js',
      },
      {
        source: 'root/src/core/nested/core.js',
        destination: 'root/infra/core/nested/core.js',
      },
    ]);
    expect(logs).toEqual([
      'Copying files for dendritestories.co.nz deployment...',
      '✓ Copied browser files to infra/browser',
      '✓ Copied core files to infra/core',
      'Ready for Terraform deployment to GCS',
    ]);
  });
});
