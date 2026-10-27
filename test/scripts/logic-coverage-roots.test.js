import { afterEach, expect, test } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { addUncoveredFiles } from '../../scripts/coverage-shards.js';

const roots = ['src/core', 'src/logic/core', 'src/logic/boundary'];
const script = fs.readFileSync('scripts/run-jest-with-coverage.js', 'utf8');
const walker = script.slice(
  script.indexOf('function listSourceFiles()'),
  script.indexOf('function runShard(')
);
const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

/** @returns {string} Empty temporary repository. */
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'logic-coverage-'));
  temporaryRoots.push(root);
  return root;
}
/**
 * Write an untested JavaScript fixture.
 * @param {string} root Repository.
 * @param {string} file Module path.
 * @returns {void} Creates the fixture on disk.
 */
function writeModule(root, file) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, 'export const value = 1;\n');
}
/**
 * Execute the real serial-runner discovery functions with controlled input.
 * @param {string} root Repository.
 * @param {object} [io] Optional filesystem failure stub.
 * @returns {string[]} Actual runner enumeration.
 */
function listSources(root, io = fs) {
  return [
    ...vm.runInNewContext(
      `${walker}\nlistSourceFiles();`,
      { fs: io, path, ROOT: root, LOGIC_SOURCE_ROOTS: roots },
      { timeout: 1000 }
    ),
  ];
}
/**
 * Load the real Jest config in a fresh process without inherited shard mode.
 * @param {string} shardMode Coverage worker flag.
 * @returns {object} Real Jest config from a fresh Node import.
 */
function readJestConfig(shardMode) {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import config from './jest.config.mjs'; console.log(JSON.stringify(config));",
      ],
      {
        encoding: 'utf8',
        env: { ...process.env, DADETO_COVERAGE_SHARD: shardMode },
      }
    )
  );
}

test('global Jest scope includes both new roots and preserves all four thresholds', () => {
  const config = readJestConfig('');
  expect(config.collectCoverageFrom).toEqual(
    roots.map(root => `${root}/**/*.js`)
  );
  expect(config.coverageThreshold.global).toEqual({
    branches: 100,
    functions: 100,
    lines: 100,
    statements: 100,
  });
  expect(readJestConfig('1').collectCoverageFrom).toEqual([]);
});

test('serial runner enumerates all logic roots and gives untested modules zero coverage', () => {
  const root = fixture();
  const files = roots.map(folder => `${folder}/nested/example.js`);
  for (const file of [
    ...files,
    'src/coreish/no.js',
    'src/logic/coreish/no.js',
    'src/logic/other/no.js',
    'src/logic/core/node_modules/no.js',
    'src/core/readme.txt',
  ])
    writeModule(root, file);
  const sources = listSources(root);
  expect(sources).toEqual(files.map(file => path.join(root, file)).sort());
  const store = path.join(root, 'coverage');
  addUncoveredFiles(sources, {}, store);
  for (const file of files) {
    const record = JSON.parse(
      fs.readFileSync(
        path.join(store, encodeURIComponent(path.join(root, file))),
        'utf8'
      )
    );
    expect(Object.values(record.s)).toEqual([0]);
  }
});

test('optional future roots may be absent while the legacy core remains mandatory', () => {
  const root = fixture();
  writeModule(root, 'src/core/example.js');
  expect(listSources(root)).toEqual([path.join(root, 'src/core/example.js')]);
  fs.rmSync(path.join(root, 'src/core'), { recursive: true });
  expect(() => listSources(root)).toThrow(/ENOENT/);
});

test('a read failure in an existing new root cannot be silently omitted', () => {
  const root = fixture();
  writeModule(root, 'src/core/example.js');
  writeModule(root, 'src/logic/boundary/example.js');
  const denied = path.join(root, 'src/logic/boundary');
  const io = {
    ...fs,
    readdirSync: (target, options) => {
      if (target === denied) throw new Error('fixture access denied');
      return fs.readdirSync(target, options);
    },
  };
  expect(() => listSources(root, io)).toThrow('fixture access denied');
});

test('a metadata error on a future root cannot be treated as an absent directory', () => {
  const root = fixture();
  writeModule(root, 'src/core/example.js');
  writeModule(root, 'src/logic/core/example.js');
  const denied = path.join(root, 'src/logic/core');
  const io = {
    ...fs,
    statSync: (target, options) => {
      if (target === denied) throw new Error('fixture metadata denied');
      return fs.statSync(target, options);
    },
  };
  expect(() => listSources(root, io)).toThrow('fixture metadata denied');
});
