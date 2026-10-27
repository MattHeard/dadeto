import { jest } from '@jest/globals';
import { createCopyCore } from '../../src/core/build/blog.js';

/**
 * Build path helpers whose outputs cannot come from native node:path.
 * @param {string} [separator] Fake path separator.
 * @returns {object} Copy API and path spies.
 */
function fixture(separator = '::') {
  const join = jest.fn((...segments) => segments.join(separator));
  const relative = jest.fn((root, file) =>
    file.replace(`${root}${separator}`, '')
  );
  const core = createCopyCore({
    createPathAdapters: () => ({ join, relative, dirname: value => value }),
    projectRoot: 'project',
    srcDir: 'source',
    publicDir: 'public',
  });
  join.mockClear();
  return { core, join, relative };
}

/**
 * Make a controlled directory entry.
 * @param {string} name Entry name.
 * @param {boolean} [directory] Whether the entry is a directory.
 * @returns {object} File-system entry fixture.
 */
function entry(name, directory = false) {
  return { name, isDirectory: () => directory, isFile: () => !directory };
}

test('recursive discovery uses the injected join at every depth', () => {
  const { core, join } = fixture();
  const tree = new Map([
    ['scan', [entry('top.js'), entry('ignore.test.js'), entry('nested', true)]],
    ['scan::nested', [entry('deeper', true)]],
    ['scan::nested::deeper', [entry('leaf.js')]],
  ]);
  const listEntries = jest.fn(directory => tree.get(directory) ?? []);
  expect(core.findJsFiles('scan', listEntries)).toEqual([
    'scan::top.js',
    'scan::nested::deeper::leaf.js',
  ]);
  expect(listEntries.mock.calls).toEqual([
    ['scan'],
    ['scan::nested'],
    ['scan::nested::deeper'],
  ]);
  expect(join).toHaveBeenCalledWith('scan::nested::deeper', 'leaf.js');
});

test('recursive copying joins both source and destination with the adapter', () => {
  const { core } = fixture();
  const tree = new Map([
    ['scan', [entry('nested', true)]],
    ['scan::nested', [entry('leaf.js')]],
  ]);
  const copyFile = jest.fn();
  const io = {
    directoryExists: () => true,
    createDirectory: jest.fn(),
    removeDirectory: jest.fn(),
    readDirEntries: directory => tree.get(directory) ?? [],
    copyFile,
  };
  core.copyDirRecursive(
    { src: 'scan', dest: 'output' },
    { io, messageLogger: { info: jest.fn() }, copyFile }
  );
  expect(copyFile).toHaveBeenCalledTimes(1);
  expect(copyFile).toHaveBeenCalledWith(
    'scan::nested::leaf.js',
    'output::nested::leaf.js'
  );
});

test('copy-pair defaults use injected paths and retain an explicit override', () => {
  const { core, relative } = fixture();
  expect(
    core.createCopyPairs(['scan::nested::leaf.js'], 'scan', 'output')
  ).toEqual([
    { source: 'scan::nested::leaf.js', destination: 'output::nested::leaf.js' },
  ]);
  expect(relative).toHaveBeenCalledWith('scan', 'scan::nested::leaf.js');
  const override = { relative: () => 'override', join: () => 'custom' };
  expect(core.createCopyPairs(['leaf'], 'scan', 'output', override)).toEqual([
    { source: 'leaf', destination: 'custom' },
  ]);
});

test('path failures propagate through discovery and default copy pairing', () => {
  const { core, join } = fixture();
  const failure = new Error('injected path failure');
  join.mockImplementation(() => {
    throw failure;
  });
  expect(() => core.findJsFiles('scan', () => [entry('leaf.js')])).toThrow(
    failure
  );
  expect(() =>
    core.createCopyPairs(['scan::leaf.js'], 'scan', 'output')
  ).toThrow(failure);
});

test('independent copy factories retain their own injected paths', () => {
  const left = fixture('::').core;
  const right = fixture('--').core;
  expect(left.createCopyPairs(['root::file.js'], 'root', 'out')).toEqual([
    { source: 'root::file.js', destination: 'out::file.js' },
  ]);
  expect(right.createCopyPairs(['root--file.js'], 'root', 'out')).toEqual([
    { source: 'root--file.js', destination: 'out--file.js' },
  ]);
  expect(left.findJsFiles('root', () => [entry('file.js')])).toEqual([
    'root::file.js',
  ]);
});
