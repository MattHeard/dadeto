import { afterEach, expect, jest, test } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createCheckDepcruiseHandle } from '../../src/core/scripts/check-depcruise.js';
import { createCheckDepcruiseScopeDeps } from '../../src/local/check-depcruise-scope.js';
import { LOGIC_SOURCE_ROOTS } from '../../src/core/local/logic-source-paths.js';

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

/**
 * Create a physical fixture with all supported logic roots.
 * @returns {string} Temporary repository root.
 */
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'logic-dependencies-'));
  temporaryRoots.push(root);
  for (const folder of LOGIC_SOURCE_ROOTS)
    fs.mkdirSync(path.join(root, folder), { recursive: true });
  return root;
}

/**
 * Write one source fixture and create its containing directories.
 * @param {string} root Temporary repository.
 * @param {string} file Repository-relative source path.
 * @param {string} source Source fixture.
 * @returns {void} Nothing.
 */
function write(root, file, source) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source);
}

/**
 * Run the production gate with actual scope analysis and filesystem adapters.
 * @param {string} root Fixture repository.
 * @param {string | undefined} sourceRoot Optional explicit legacy override.
 * @returns {{result: object, errors: string, spawn: Function}} Gate observations.
 */
function scan(root, sourceRoot) {
  const messages = [];
  const spawn = jest.fn(() => ({ status: 0, signal: null }));
  const handle = createCheckDepcruiseHandle({
    rootDir: root,
    sourceRoot,
    pathModule: path,
    readFileSync: fs.readFileSync,
    readdirSync: fs.readdirSync,
    spawnImpl: spawn,
    stdout: { write() {} },
    stderr: { write: text => messages.push(text) },
    scopeAnalysisDeps: createCheckDepcruiseScopeDeps(),
  });
  return { result: handle(), errors: messages.join(''), spawn };
}

test.each(['src/logic/core', 'src/logic/boundary'])(
  'the default gate rejects implicit browser globals in %s',
  folder => {
    const root = fixture();
    write(root, `${folder}/example.js`, 'export const view = window;\n');
    const observed = scan(root);
    expect(observed.result).toEqual({ exitCode: 1, violations: 1 });
    expect(observed.errors).toContain(`${folder}/example.js`);
    expect(observed.spawn).toHaveBeenCalledTimes(1);
  }
);

test('the default gate scans random calls in both new roots in one external launch', () => {
  const root = fixture();
  for (const folder of ['src/logic/core', 'src/logic/boundary'])
    write(root, `${folder}/random.js`, 'export const value = Math.random();\n');
  const observed = scan(root);
  expect(observed.result).toEqual({ exitCode: 1, violations: 2 });
  expect(observed.errors).toContain('src/logic/core/random.js');
  expect(observed.errors).toContain('src/logic/boundary/random.js');
  expect(observed.spawn).toHaveBeenCalledTimes(1);
});

test('explicit roots, injected globals and strings retain their existing behavior', () => {
  const root = fixture();
  write(root, 'src/logic/core/forbidden.js', 'export const view = window;\n');
  write(root, 'src/custom/example.js', 'export const view = window;\n');
  expect(scan(root, 'src/core').result).toEqual({ exitCode: 0, violations: 0 });
  expect(scan(root, 'src/custom').result).toEqual({
    exitCode: 1,
    violations: 1,
  });
  write(
    root,
    'src/logic/core/forbidden.js',
    `
export function useWindow(window) { return window.document; }
export const label = 'window Math.random()';
// Math.random() and window in comments are not runtime globals.
`
  );
  const clean = scan(root);
  expect({ result: clean.result, errors: clean.errors }).toEqual({
    result: { exitCode: 0, violations: 0 },
    errors: '',
  });
});

test('real dependency-cruiser enforces portability, direction and domain isolation', () => {
  const root = fixture();
  const value = 'export const value = 1;\n';
  write(root, 'src/local/platform.js', value);
  write(
    root,
    'node_modules/logic-fixture/package.json',
    JSON.stringify({ name: 'logic-fixture', main: 'index.js' })
  );
  write(root, 'node_modules/logic-fixture/index.js', value);
  write(root, 'src/core/shared.js', value);
  write(root, 'src/logic/core/shared.js', value);
  write(root, 'src/logic/boundary/parser.js', "import '../core/shared.js';\n");
  for (const integration of ['browser', 'build', 'cloud', 'local'])
    write(
      root,
      `src/${integration}/entry.js`,
      "import '../logic/core/shared.js';\nimport '../logic/boundary/parser.js';\n"
    );
  for (const integration of ['build', 'cloud', 'local'])
    write(
      root,
      `src/${integration}/native.js`,
      "import 'node:fs';\nimport 'fs/promises';\n"
    );
  write(root, 'src/browser/native.js', "import 'node:fs';\n");
  for (const folder of LOGIC_SOURCE_ROOTS) {
    write(
      root,
      `${folder}/native.js`,
      "import 'node:fs';\nimport 'fs/promises';\n"
    );
    const platformPath = path.relative(folder, 'src/local/platform.js');
    write(
      root,
      `${folder}/platform.js`,
      `import 'logic-fixture';\nimport '${platformPath}';\n`
    );
    write(root, `${folder}/build/value.js`, value);
    write(root, `${folder}/browser/wrong.js`, "import '../build/value.js';\n");
  }
  write(
    root,
    'src/logic/core/untrusted.js',
    "import '../boundary/parser.js';\n"
  );
  write(
    root,
    'dependency-cruiser.config.cjs',
    fs.readFileSync('dependency-cruiser.config.cjs', 'utf8')
  );
  const report = runDependencyGraph(root);
  expect(report.summary.error).toBeGreaterThan(0);
  const violations = report.summary.violations;
  for (const folder of LOGIC_SOURCE_ROOTS) {
    assertNativeImportsBlocked(violations, folder);
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: `${folder}/platform.js`,
          to: 'src/local/platform.js',
        }),
        expect.objectContaining({
          from: `${folder}/platform.js`,
          to: 'node_modules/logic-fixture/index.js',
        }),
        expect.objectContaining({
          from: `${folder}/browser/wrong.js`,
          to: `${folder}/build/value.js`,
        }),
      ])
    );
  }
  expect(violations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        from: 'src/logic/core/untrusted.js',
        to: 'src/logic/boundary/parser.js',
      }),
    ])
  );
  expect(violations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        from: 'src/browser/native.js',
        to: 'fs',
        rule: expect.objectContaining({ name: 'src-browser-only-core' }),
      }),
    ])
  );
  expect(
    violations.filter(item =>
      /^src\/(build|cloud|local)\/native\.js$/.test(item.from)
    )
  ).toEqual([]);
  expect(violations.filter(item => item.from.endsWith('/entry.js'))).toEqual(
    []
  );
  expect(
    violations.filter(item => item.from === 'src/logic/boundary/parser.js')
  ).toEqual([]);
});

/**
 * Run actual dependency-cruiser against a fixture and retain its reported violations.
 * @param {string} root Fixture root.
 * @returns {object} Real graph report.
 */
function runDependencyGraph(root) {
  const execution = spawnSync(
    process.execPath,
    [
      path.resolve('node_modules/dependency-cruiser/bin/dependency-cruise.mjs'),
      '--config',
      path.join(root, 'dependency-cruiser.config.cjs'),
      '--output-type',
      'json',
      'src',
    ],
    { cwd: root, encoding: 'utf8', timeout: 20000 }
  );
  expect(execution.error).toBeUndefined();
  // JSON output carries rule failures in its summary rather than process status.
  expect(execution.status).toBe(0);
  return JSON.parse(execution.stdout);
}

/**
 * Require the named native rule to observe both normalized native import forms.
 * @param {object[]} violations Actual cruiser violations.
 * @param {string} folder Logic root.
 * @returns {void} Nothing.
 */
function assertNativeImportsBlocked(violations, folder) {
  for (const native of ['fs', 'fs/promises'])
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: `${folder}/native.js`,
          to: native,
          rule: expect.objectContaining({
            name: 'src-core-scripts-no-node-builtins',
          }),
        }),
      ])
    );
}

const configControls = [
  [
    'missing named prohibition',
    config => ({
      ...config,
      forbidden: config.forbidden.filter(
        rule => rule.name !== 'src-core-scripts-no-node-builtins'
      ),
    }),
  ],
  [
    'old hidden endpoints',
    config => ({
      ...config,
      options: {
        ...config.options,
        includeOnly: '^(src|scripts|node_modules)',
      },
    }),
  ],
];

test.each(configControls)(
  'native regression rejects negative config control: %s',
  (label, mutate) => {
    const root = fixture();
    for (const folder of LOGIC_SOURCE_ROOTS)
      write(
        root,
        `${folder}/native.js`,
        "import 'node:fs';\nimport 'fs/promises';\n"
      );
    const base = createRequire(import.meta.url)(
      '../../dependency-cruiser.config.cjs'
    );
    write(
      root,
      'dependency-cruiser.config.cjs',
      `module.exports = ${JSON.stringify(mutate(base))};\n`
    );
    const report = runDependencyGraph(root);
    expect(() =>
      LOGIC_SOURCE_ROOTS.forEach(folder =>
        assertNativeImportsBlocked(report.summary.violations, folder)
      )
    ).toThrow();
  }
);
