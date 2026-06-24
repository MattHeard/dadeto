import { jest } from '@jest/globals';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertFunction,
  createAsyncFsAdapters,
  createFsAdapters,
  createFsHandle,
  createPathAdapters,
  createPathHandle,
  firstStringOrNull,
  ensureString,
  arrayOrEmpty,
  getDefinedStrings,
  getCurrentDirectory,
  getRecordOrNull,
  isNonNullObject,
  isNullish,
  isValidString,
  normalizeNonStringValue,
  resolveMessageOrDefault,
  stringOrNull,
  stringOrFallback,
  whenString,
  whenType,
  whenTypeValue,
  trimmedStringOrEmpty,
  whenArray,
  whenTruthy,
  whenOrNull,
  whenNotNullish,
  whenNotNullishValue,
  numberOrZero,
  when,
  tryOr,
  trimmedStringOrNull,
  runEntriesInParallel,
  runMappedEntries,
  resolveRunCheckOptions,
  resolveProjectDirectories,
} from '../../src/core/commonCore.js';
import {
  areValidStrings,
  getStringCandidate,
  functionOrFallback,
  isBlankStringValue,
  isNullishOrEmptyString,
  normalizeObjectOrFallback,
  reportAndReturnFalse,
  guardThen,
  whenOrDefault,
} from '../../src/core/browser/browser-core.js';

describe('commonCore helpers', () => {
  test('base validators and normalizers behave as expected', () => {
    expect(isValidString('hello')).toBe(true);
    expect(isValidString('')).toBe(false);
    expect(areValidStrings('a', 'b', 'c')).toBe(true);
    expect(areValidStrings('a', '', 'c')).toBe(false);
    expect(isNullish(null)).toBe(true);
    expect(isNullish(undefined)).toBe(true);
    expect(isNullish('hello')).toBe(false);
    expect(isBlankStringValue('   ')).toBe(true);
    expect(isBlankStringValue('hello')).toBe(false);
    expect(isBlankStringValue(123)).toBe(false);
    expect(arrayOrEmpty(['hello'])).toEqual(['hello']);
    expect(arrayOrEmpty('hello')).toEqual([]);
    expect(isNonNullObject({ hello: 'world' })).toBe(true);
    expect(isNonNullObject(null)).toBe(false);
  });

  test('assertFunction accepts callables and rejects non-functions', () => {
    expect(() => assertFunction(() => {}, 'fn')).not.toThrow();
    expect(() => assertFunction('nope', 'fn')).toThrow('fn must be a function');
  });

  test('string candidate helpers normalize strings predictably', () => {
    expect(getStringCandidate('hello')).toBe('hello');
    expect(getStringCandidate(123)).toBeUndefined();
    expect(getRecordOrNull({ hello: 'world' })).toEqual({ hello: 'world' });
    expect(getRecordOrNull(null)).toBeNull();
    expect(
      getDefinedStrings('alpha', null, 'beta', undefined, 'gamma')
    ).toEqual(['alpha', 'beta', 'gamma']);
    expect(ensureString('hello')).toBe('hello');
    expect(ensureString(123)).toBe('');
    expect(normalizeNonStringValue('hello')).toBe('hello');
    expect(normalizeNonStringValue(null)).toBe('');
    expect(normalizeNonStringValue(123)).toBe('123');
  });

  test('string normalization helpers return strings or fallbacks predictably', () => {
    expect(stringOrNull('hello')).toBe('hello');
    expect(stringOrNull(123)).toBeNull();
    expect(resolveMessageOrDefault('hello', 'fallback')).toBe('hello');
    expect(resolveMessageOrDefault(123, 'fallback')).toBe('fallback');
  });

  test('stringOrFallback defers to the fallback when value is not a string', () => {
    const fallback = jest.fn(() => 'fallback-value');
    expect(stringOrFallback(123, fallback)).toBe('fallback-value');
    expect(fallback).toHaveBeenCalledWith(123);
  });

  test('firstStringOrNull returns the first non-empty trimmed string', () => {
    expect(firstStringOrNull('  hello  ')).toBe('hello');
    expect(firstStringOrNull('   ')).toBeNull();
    expect(firstStringOrNull(['  world  '])).toBe('world');
    expect(firstStringOrNull([123, ' nope '])).toBeNull();
    expect(firstStringOrNull(123)).toBeNull();
  });

  test('trimmedStringOrEmpty returns a trimmed string or an empty string', () => {
    expect(trimmedStringOrEmpty('  hello  ')).toBe('hello');
    expect(trimmedStringOrEmpty('')).toBe('');
    expect(trimmedStringOrEmpty(123)).toBe('');
  });

  test('trimmedStringOrNull returns a trimmed string or null', () => {
    expect(trimmedStringOrNull('  hello  ')).toBe('hello');
    expect(trimmedStringOrNull('   ')).toBeNull();
    expect(trimmedStringOrNull(123)).toBeNull();
  });

  test('reportAndReturnFalse invokes the reporter and returns false', () => {
    const reporter = jest.fn();
    expect(reportAndReturnFalse(reporter, 'alpha', 'beta')).toBe(false);
    expect(reporter).toHaveBeenCalledWith('alpha', 'beta');
  });

  test('whenString executes the callback for strings only', () => {
    expect(whenString('hello', value => value.toUpperCase())).toBe('HELLO');
    expect(whenString(123, value => value)).toBeNull();
  });

  test('normalizeObjectOrFallback uses fallback for non-objects and maps objects', () => {
    const fallback = jest.fn(() => ({ fallback: true }));
    const transform = jest.fn(value => ({ ...value, mapped: true }));
    expect(normalizeObjectOrFallback(null, fallback, transform)).toEqual({
      fallback: true,
    });
    expect(
      normalizeObjectOrFallback({ hello: 'world' }, fallback, transform)
    ).toEqual({
      hello: 'world',
      mapped: true,
    });
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(transform).toHaveBeenCalledTimes(1);
  });

  test('isNullishOrEmptyString detects missing string-like values', () => {
    expect(isNullishOrEmptyString(null)).toBe(true);
    expect(isNullishOrEmptyString(undefined)).toBe(true);
    expect(isNullishOrEmptyString('')).toBe(true);
    expect(isNullishOrEmptyString('value')).toBe(false);
  });

  test('whenType executes the callback for the requested typeof only', () => {
    expect(whenType('hello', 'string', value => value.toUpperCase())).toBe(
      'HELLO'
    );
    expect(whenType(123, 'string', value => value)).toBeNull();
    expect(
      whenType(
        () => {},
        'function',
        value => value
      )
    ).toEqual(expect.any(Function));
  });

  test('whenTypeValue returns the original value for matching typeof inputs', () => {
    expect(whenTypeValue('hello', 'string')).toBe('hello');
    expect(whenTypeValue(123, 'number')).toBe(123);
    expect(whenTypeValue({}, 'function')).toBeNull();
  });

  test('whenNotNullish executes the callback for present values only', () => {
    expect(whenNotNullish('hello', value => value)).toBe('hello');
    expect(whenNotNullish(null, value => value)).toBeNull();
    expect(whenNotNullish(undefined, value => value)).toBeNull();
  });

  test('whenNotNullishValue returns the original value when present', () => {
    expect(whenNotNullishValue('hello')).toBe('hello');
    expect(whenNotNullishValue(0)).toBe(0);
    expect(whenNotNullishValue(null)).toBeNull();
    expect(whenNotNullishValue(undefined)).toBeNull();
  });

  test('whenArray executes the callback for arrays only', () => {
    expect(whenArray(['hello'], value => value.slice())).toEqual(['hello']);
    expect(whenArray('hello', value => value)).toBeNull();
  });

  test('whenTruthy executes the callback for truthy values only', () => {
    expect(whenTruthy('hello', value => value.toUpperCase())).toBe('HELLO');
    expect(whenTruthy('', value => value)).toBeNull();
  });

  test('whenOrNull executes the callback when the condition passes', () => {
    expect(whenOrNull(true, () => 'ok')).toBe('ok');
    expect(whenOrNull(false, () => 'nope')).toBeNull();
  });

  test('whenOrDefault returns the fallback when the condition fails', () => {
    expect(whenOrDefault(true, () => 'ok', 'nope')).toBe('ok');
    expect(whenOrDefault(false, () => 'ok', 'nope')).toBe('nope');
  });

  test('functionOrFallback returns a callable candidate or the fallback', () => {
    const fallback = () => () => 'fallback';
    expect(functionOrFallback(() => 'value', fallback)()).toBe('value');
    expect(functionOrFallback(123, fallback)()).toBe('fallback');
  });

  test('guardThen runs the effect only when condition is true', () => {
    const effect = jest.fn();
    expect(guardThen(false, effect)).toBe(false);
    expect(effect).not.toHaveBeenCalled();
    expect(guardThen(true, effect)).toBe(true);
    expect(effect).toHaveBeenCalled();
  });

  test('numberOrZero returns numeric values or zero for other inputs', () => {
    expect(numberOrZero(42)).toBe(42);
    expect(numberOrZero('42')).toBe(0);
    expect(numberOrZero(undefined)).toBe(0);
  });

  test('when returns transform when condition passes and fallback when it fails', () => {
    const transform = () => 'transformed';
    const fallback = () => 'fallback';
    expect(when(true, transform, fallback)).toBe('transformed');
    expect(when(false, transform, fallback)).toBe('fallback');
  });

  test('tryOr returns fallback when action throws', () => {
    const fallback = () => 'safe';
    expect(tryOr(() => 'ok', fallback)).toBe('ok');
    expect(
      tryOr(() => {
        throw new Error('boom');
      }, fallback)
    ).toBe('safe');
  });

  test('runEntriesInParallel returns empty array for empty input', async () => {
    await expect(
      runEntriesInParallel([], async () => 'unused')
    ).resolves.toEqual([]);
  });

  test('runMappedEntries maps payloads before invoking runner', async () => {
    const seen = [];
    await runMappedEntries(
      [1, 2],
      value => value * 10,
      async payload => {
        seen.push(payload);
      }
    );
    expect(seen).toEqual([10, 20]);
  });

  test('path and filesystem adapter handles expose the shared helpers', () => {
    const pathHandle = createPathHandle({
      pathModule: path,
      fileURLToPathFn: fileURLToPath,
      dirnameFn: path.dirname,
    });
    const fsHandle = createFsHandle({
      fsModule: fs,
      fsPromisesModule: fsPromises,
    });

    expect(
      pathHandle.getCurrentDirectory('file:///tmp/dadeto/src/core/example.js')
    ).toBe('/tmp/dadeto/src/core');
    expect(
      pathHandle.resolveProjectDirectories('/tmp/dadeto/src/core')
    ).toEqual({
      projectRoot: '/tmp/dadeto',
      srcDir: '/tmp/dadeto/src',
      publicDir: '/tmp/dadeto/public',
    });
    expect(pathHandle.createPathAdapters()).toMatchObject({
      join: path.join,
      dirname: path.dirname,
      relative: path.relative,
      resolve: path.resolve,
      extname: path.extname,
    });
    expect(fsHandle.createFsAdapters()).toEqual(expect.any(Object));
    expect(fsHandle.createAsyncFsAdapters()).toEqual(expect.any(Object));
  });

  test('path helpers derive module and project directories', () => {
    expect(
      getCurrentDirectory(
        'file:///tmp/dadeto/src/core/example.js',
        fileURLToPath,
        path.dirname
      )
    ).toBe('/tmp/dadeto/src/core');
    expect(
      resolveProjectDirectories('/tmp/dadeto/src/core', path.resolve)
    ).toEqual({
      projectRoot: '/tmp/dadeto',
      srcDir: '/tmp/dadeto/src',
      publicDir: '/tmp/dadeto/public',
    });
    expect(createPathAdapters(path)).toMatchObject({
      join: path.join,
      dirname: path.dirname,
      relative: path.relative,
      resolve: path.resolve,
      extname: path.extname,
    });
  });

  test('filesystem adapters read, create, and copy files', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dadeto-core-'));
    const syncAdapters = createFsAdapters(fs);
    const asyncAdapters = createAsyncFsAdapters(fsPromises);

    try {
      const nestedDir = path.join(root, 'nested');
      const sourceFile = path.join(root, 'source.txt');
      const copiedFile = path.join(root, 'copied.txt');

      expect(syncAdapters.directoryExists(root)).toBe(true);
      syncAdapters.createDirectory(nestedDir);
      expect(
        syncAdapters.readDirEntries(root).some(entry => entry.name === 'nested')
      ).toBe(true);
      syncAdapters.removeDirectory(nestedDir);
      expect(syncAdapters.directoryExists(nestedDir)).toBe(false);

      fs.writeFileSync(sourceFile, 'hello');
      syncAdapters.copyFile(sourceFile, copiedFile);
      expect(fs.readFileSync(copiedFile, 'utf8')).toBe('hello');

      await expect(
        asyncAdapters.readDirEntries(path.join(root, 'missing'))
      ).resolves.toEqual([]);

      const failingAsyncAdapters = createAsyncFsAdapters({
        readdir: async () => {
          const error = new Error('permission denied');
          error.code = 'EACCES';
          throw error;
        },
        mkdir: fsPromises.mkdir,
        copyFile: fsPromises.copyFile,
      });
      await expect(
        failingAsyncAdapters.readDirEntries(path.join(root, 'forbidden'))
      ).rejects.toThrow('permission denied');

      const asyncDir = path.join(root, 'async');
      await asyncAdapters.ensureDirectory(asyncDir);
      fs.writeFileSync(path.join(asyncDir, 'value.txt'), 'world');
      const asyncEntries = await asyncAdapters.readDirEntries(asyncDir);
      expect(asyncEntries.map(entry => entry.name)).toContain('value.txt');
      const asyncCopy = path.join(root, 'async-copy.txt');
      await asyncAdapters.copyFile(sourceFile, asyncCopy);
      expect(await fsPromises.readFile(asyncCopy, 'utf8')).toBe('hello');

      const textFile = path.join(root, 'value.txt');
      await asyncAdapters.writeFile(textFile, 'world');
      await expect(asyncAdapters.readFile(textFile, 'utf8')).resolves.toBe(
        'world'
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('resolveRunCheckOptions falls back to default writers and clock helpers', () => {
    const stdoutSpy = jest
      .spyOn(process, 'stdout', 'get')
      .mockReturnValue(undefined);
    const stderrSpy = jest
      .spyOn(process, 'stderr', 'get')
      .mockReturnValue(undefined);
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(123456);

    try {
      const resolved = resolveRunCheckOptions({}, { defaultSpawn: jest.fn() });

      expect(resolved.stdout.write).toEqual(expect.any(Function));
      expect(resolved.stderr.write).toEqual(expect.any(Function));
      expect(() => resolved.stdout.write('noop')).not.toThrow();
      expect(() => resolved.stderr.write('noop')).not.toThrow();
      expect(resolved.now()).toBe(123456);
    } finally {
      nowSpy.mockRestore();
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });

  test('resolveRunCheckOptions uses the real process streams when available', () => {
    const resolved = resolveRunCheckOptions({}, { defaultSpawn: jest.fn() });

    expect(resolved.stdout).toBe(process.stdout);
    expect(resolved.stderr).toBe(process.stderr);
  });

  test('resolveRunCheckOptions uses built-in defaults when called without arguments', () => {
    const resolved = resolveRunCheckOptions();

    expect(resolved.commands).toHaveLength(9);
    expect(resolved.failFast).toBe(false);
    expect(resolved.stdout).toBe(process.stdout);
    expect(resolved.stderr).toBe(process.stderr);
  });
});
