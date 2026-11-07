import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { RE2JS } from 're2js';

const require = createRequire(import.meta.url);
const glob = createRequire(require.resolve('jest-config'))('glob');

test.each([
  'eslint',
  '@stryker-mutator/core',
  '@typescript-eslint/typescript-estree',
])('modern minimatch retains the matching API consumed by %s', consumer => {
  const fromConsumer = createRequire(
    path.resolve(`node_modules/${consumer}/package.json`)
  );
  const { Minimatch, minimatch } = fromConsumer('minimatch');
  const matcher = new Minimatch('src/{core,logic}/**/*.js', { dot: true });
  expect(matcher.match('src/logic/core/nested/file.js')).toBe(true);
  expect(matcher.match('src/core/.private/file.js')).toBe(true);
  expect(matcher.match('test/file.js')).toBe(false);
  expect(minimatch('test/generator/body.test.js', '**/*.test.js')).toBe(true);
});

test('Jest glob retains synchronous and asynchronous brace matching', async () => {
  const pattern = 'test/generator/{orderedPostBody,staticJsonlTable}.test.js';
  const expected = [
    'test/generator/orderedPostBody.test.js',
    'test/generator/staticJsonlTable.test.js',
  ];
  expect(glob.sync(pattern).sort()).toEqual(expected);
  expect((await glob.glob(pattern)).sort()).toEqual(expected);
});

test('glob abort prevents subsequent directory traversal', async () => {
  const controller = new AbortController();
  const reason = new Error('probe-abort');
  let reads = 0;
  const reader = {
    ...fs,
    readdir(directory, options, callback) {
      reads += 1;
      fs.readdir(directory, options, (error, entries) => {
        controller.abort(reason);
        callback(error, entries);
      });
    },
  };
  await expect(
    glob.glob('**/*.test.js', {
      cwd: 'test',
      fs: reader,
      signal: controller.signal,
    })
  ).rejects.toBe(reason);
  const readsAtRejection = reads;
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  expect(readsAtRejection).toBe(1);
  expect(reads).toBe(readsAtRejection);
});

test('legacy test-exclude keeps its callable glob and minimatch APIs', () => {
  const fromLegacy = createRequire(require.resolve('test-exclude'));
  expect(typeof fromLegacy('glob')).toBe('function');
  expect(fromLegacy('minimatch')('src/example.js', '**/*.js')).toBe(true);
});

test('RE2JS preserves repeated lookbehind matching semantics', () => {
  const matcher = RE2JS.compile('(?<=a)b', RE2JS.LOOKBEHINDS).matcher(
    'ab'.repeat(100)
  );
  const positions = [];
  while (matcher.find()) positions.push(matcher.start());
  expect(positions).toEqual(Array.from({ length: 100 }, (_, i) => 2 * i + 1));
});
