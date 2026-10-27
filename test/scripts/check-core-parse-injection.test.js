import { jest } from '@jest/globals';
import {
  createCheckCoreParseHandle,
  createCheckParseNotValidateHandle,
  checkCoreParseTestUtils,
} from '../../src/core/scripts/check-core-parse.js';

/**
 * Create a source scan with controlled classification and no parser dependency.
 * @param {import('../../src/core/scripts/check-core-parse.js').ClassifySource | undefined} classifySource Injected classification callback.
 * @param {{file?: string, exempt?: boolean}} [options] Virtual file options.
 * @returns {object} Gate options.
 */
function fixture(
  classifySource,
  { file = 'src/core/domain.js', exempt = false } = {}
) {
  const files = {
    [`/repo/${file}`]: 'deliberately invalid JavaScript @@@',
    '/repo/core-parse-exemptions.json': JSON.stringify({
      exemptions: exempt ? { [file]: 'fixture' } : {},
    }),
  };
  return {
    classifySource,
    rootDir: '/repo',
    pathModule: {
      resolve: (...parts) => parts.filter(Boolean).join('/'),
      join: (...parts) => parts.filter(Boolean).join('/'),
      relative: (_root, target) => target.replace('/repo/', ''),
      sep: '/',
    },
    fsModule: {
      readdirSync: directory => {
        const prefix = `${directory}/`;
        const names = Object.keys(files)
          .filter(target => target.startsWith(prefix))
          .map(target => target.slice(prefix.length).split('/')[0]);
        return [...new Set(names)].map(name => ({
          name,
          isDirectory: () =>
            Object.keys(files).some(target =>
              target.startsWith(`${prefix}${name}/`)
            ),
          isFile: () => files[`${prefix}${name}`] !== undefined,
        }));
      },
      readFileSync: jest.fn(target => files[target] ?? ''),
    },
    stdout: { log: jest.fn(), error: jest.fn() },
  };
}

test('uses the supplied classifier and preserves label precedence and ordering', () => {
  const classifySource = jest.fn(() => [
    { name: 'guard', labels: ['validator'] },
    { name: 'parse', labels: ['parser'] },
    { name: 'both', labels: ['parser', 'validator'] },
    { name: 'domain', labels: [] },
  ]);
  const result = createCheckCoreParseHandle(fixture(classifySource))();
  expect(result).toEqual({
    exitCode: 1,
    violations: [
      { filePath: 'src/core/domain.js', name: 'guard' },
      { filePath: 'src/core/domain.js', name: 'parse' },
      { filePath: 'src/core/domain.js', name: 'both' },
    ],
  });
  expect(classifySource.mock.calls).toEqual([
    ['deliberately invalid JavaScript @@@'],
    ['deliberately invalid JavaScript @@@'],
  ]);
});

test('propagates classifier failures without a silent empty classification', () => {
  const failure = new Error('classifier failed');
  const options = fixture(() => {
    throw failure;
  });
  expect(() => createCheckParseNotValidateHandle(options)()).toThrow(failure);
  expect(options.stdout.error).not.toHaveBeenCalled();
});

test('missing classification in a configured scan is a programming error', () => {
  const options = fixture(undefined);
  expect(() => createCheckParseNotValidateHandle(options)()).toThrow(TypeError);
});

test('the legacy empty scan default has an explicit failing classifier', () => {
  expect(createCheckCoreParseHandle()()).toEqual({
    exitCode: 0,
    violations: [],
  });
  const defaults = checkCoreParseTestUtils.normalizeOptions();
  expect(() => defaults.classifySource('source')).toThrow(
    new TypeError('classifySource must be provided')
  );
});

test('inert defaults retain the documented paths and empty adapters', () => {
  const defaults = checkCoreParseTestUtils.normalizeOptions();
  expect({
    root: defaults.rootDir,
    source: defaults.sourceRoot,
    exemptions: defaults.configPath,
    separator: defaults.pathModule.sep,
  }).toEqual({
    root: '.',
    source: 'src/core',
    exemptions: 'core-parse-exemptions.json',
    separator: '/',
  });
  expect(
    defaults.fsModule.readdirSync('unused', { withFileTypes: true })
  ).toEqual([]);
  expect(defaults.fsModule.readFileSync('unused', 'utf8')).toBe('');
  expect(defaults.stdout.log('unused')).toBeUndefined();
  expect(defaults.stdout.error('unused')).toBeUndefined();
});

test.each([
  'src/core/index.js',
  'src/core/main.js',
  'src/core/browser/domain.js',
  'src/core/cloud/domain.js',
  'src/core/local/domain.js',
  'src/core/scripts/domain.js',
  'src/core/build/domain.js',
  'index.js',
  'main.js',
  'browser/domain.js',
  'cloud/domain.js',
  'local/domain.js',
  'scripts/domain.js',
  'build/domain.js',
])('does not classify the existing boundary path %s', file => {
  const classifySource = jest.fn(() => [
    { name: 'guard', labels: ['validator'] },
  ]);
  const options = { ...fixture(classifySource, { file }), sourceRoot: '' };
  expect(createCheckParseNotValidateHandle(options)()).toEqual({
    exitCode: 0,
    violations: [],
  });
  expect(classifySource).not.toHaveBeenCalled();
});

test('a non-boundary exemption independently skips classification', () => {
  const classifySource = jest.fn(() => [
    { name: 'guard', labels: ['validator'] },
  ]);
  const options = fixture(classifySource, { exempt: true });
  expect(createCheckParseNotValidateHandle(options)()).toEqual({
    exitCode: 0,
    violations: [],
  });
  expect(classifySource).not.toHaveBeenCalled();
});

test.each(['src/core/index.js.extra.js', 'src/core/main.js.backup.js'])(
  'boundary basename matching stays anchored for %s',
  file => {
    const classifySource = jest.fn(() => [
      { name: 'guard', labels: ['validator'] },
    ]);
    expect(
      createCheckParseNotValidateHandle(fixture(classifySource, { file }))()
    ).toEqual({
      exitCode: 1,
      violations: [{ filePath: file, name: 'guard' }],
    });
  }
);

test('reads source as UTF-8 and emits both exact success diagnostics', () => {
  const options = fixture(() => []);
  expect(createCheckCoreParseHandle(options)()).toEqual({
    exitCode: 0,
    violations: [],
  });
  expect(options.fsModule.readFileSync).toHaveBeenCalledWith(
    '/repo/src/core/domain.js',
    'utf8'
  );
  expect(options.stdout.log.mock.calls).toEqual([
    [
      'Checked parse-not-validate in src/core; no validation helpers found outside boundaries.',
    ],
    [
      'Checked parse-boundary in src/core; no raw-input interpretation found outside boundaries.',
    ],
  ]);
});
