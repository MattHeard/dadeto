import { jest } from '@jest/globals';
import path from 'node:path';
import {
  checkDepcruiseTestUtils,
  createCheckDepcruiseHandle,
  findCoreBrowserMainGlobalViolations,
  findCoreGlobalViolations,
  findCoreMathRandomViolations,
} from '../../../src/core/scripts/check-depcruise.js';

/**
 * Build a file-like dirent stub.
 * @param {string} name Entry name.
 * @returns {{ name: string, isDirectory: () => boolean, isFile: () => boolean }} File dirent stub.
 */
function createDirentFile(name) {
  return {
    name,
    isDirectory: () => false,
    isFile: () => true,
  };
}

/**
 * Build a directory-like dirent stub.
 * @param {string} name Entry name.
 * @returns {{ name: string, isDirectory: () => boolean, isFile: () => boolean }} Directory dirent stub.
 */
function createDirentDirectory(name) {
  return {
    name,
    isDirectory: () => true,
    isFile: () => false,
  };
}

/**
 * Create a test writer that records written chunks.
 * @returns {{ chunks: string[], write: (text: string) => void }} Writer stub.
 */
function createWriter() {
  const chunks = [];
  return {
    chunks,
    write(text) {
      chunks.push(text);
    },
  };
}

describe('findCoreMathRandomViolations', () => {
  test('finds direct Math.random usage while ignoring comments and strings', () => {
    const readFileSync = jest.fn(filePath => {
      if (filePath.endsWith('match.js')) {
        return [
          'const value = Math.random();',
          "const single = 'Math.random';",
          'const double = "Math.random";',
          'const template = `Math.random`;',
          "const escapedSingle = '\\\\';",
          'const escapedTemplate = `\\\\`;',
          '// Math.random should not count',
          '/* Math.random should not count either */',
          'const ignored = aMath.random;',
        ].join('\n');
      }

      return ['const note = `Math.random in a template literal`;'].join('\n');
    });
    const readdirSync = jest.fn(dirPath => {
      if (dirPath === '/repo/src/core') {
        return [
          createDirentFile('match.js'),
          createDirentFile('notes.txt'),
          createDirentDirectory('nested'),
        ];
      }

      if (dirPath === '/repo/src/core/nested') {
        return [createDirentFile('ignore.js')];
      }

      return [];
    });

    const violations = findCoreMathRandomViolations({
      readFileSync,
      readdirSync,
      rootDir: '/repo',
      sourceRoot: 'src/core',
      pathModule: path,
    });

    expect(violations).toEqual([
      { filePath: 'src/core/match.js', occurrences: 1 },
    ]);
  });

  test('counts multiple direct uses in one file as plural violations', () => {
    const readFileSync = jest.fn(() =>
      ['const first = Math.random();', 'const second = Math.random();'].join(
        '\n'
      )
    );
    const readdirSync = jest.fn(() => [createDirentFile('double.js')]);

    const violations = findCoreMathRandomViolations({
      readFileSync,
      readdirSync,
      rootDir: '/repo',
      sourceRoot: 'src/core',
      pathModule: path,
    });

    expect(violations).toEqual([
      { filePath: 'src/core/double.js', occurrences: 2 },
    ]);
  });

  test('scanQuotedString closes quoted strings and respects escapes', () => {
    expect(
      checkDepcruiseTestUtils.scanQuotedString("'abc'", 4, "'", 'code')
    ).toEqual({ count: 0, nextIndex: 5, nextState: 'code' });
    expect(
      checkDepcruiseTestUtils.scanQuotedString("'\\\\'", 1, "'", 'code')
    ).toEqual({ count: 0, nextIndex: 3, nextState: 'code' });
  });

  test('isBoundary treats missing characters as boundaries', () => {
    expect(checkDepcruiseTestUtils.isBoundary(undefined)).toBe(true);
  });

  test('normalizeCheckDepcruiseOptions fills every default dependency', () => {
    expect(
      checkDepcruiseTestUtils.normalizeCheckDepcruiseOptions({
        pathModule: path,
      })
    ).toMatchObject({
      rootDir: '.',
      sourceRoot: 'src/core',
      configPath: 'dependency-cruiser.config.cjs',
    });
  });

  test('normalizeCheckDepcruiseOptions requires injected path helpers', () => {
    expect(() =>
      checkDepcruiseTestUtils.normalizeCheckDepcruiseOptions({})
    ).toThrow('pathModule is required.');
    expect(() =>
      checkDepcruiseTestUtils.normalizeCheckDepcruiseOptions()
    ).toThrow('pathModule is required.');
  });

  test('stripBrowserMainPolicyNoise keeps only executable browser main code', () => {
    expect(
      checkDepcruiseTestUtils.stripBrowserMainPolicyNoise(
        [
          "import { createMainHandle } from '../core/browser/main.js';",
          '',
          '/** doc comment */',
          'export function createMainHandle() {',
          '  return function handleMain() {};',
          '}',
        ].join('\n')
      )
    ).toBe(
      [
        'export function createMainHandle() {',
        '  return function handleMain() {};',
        '}',
      ].join('\n')
    );
  });

  test('stripBrowserMainPolicyNoise returns the original text when no handle exists', () => {
    expect(
      checkDepcruiseTestUtils.stripBrowserMainPolicyNoise('const x = 1;\n')
    ).toBe('const x = 1;\n');
    expect(checkDepcruiseTestUtils.stripBrowserMainPolicyNoise(null)).toBe('');
    expect(checkDepcruiseTestUtils.stripBrowserMainPolicyNoise(undefined)).toBe(
      ''
    );
  });
});

describe('findCoreGlobalViolations', () => {
  test('finds direct browser-global usage in any core file while ignoring comments and strings', () => {
    const readFileSync = jest.fn(filePath => {
      if (filePath.endsWith('match.js')) {
        return [
          'const storage = localStorage;',
          'window.addEventListener("load", () => {});',
          'document.addEventListener("click", () => {});',
          "const single = 'localStorage window document';",
          'const double = "localStorage window document";',
          'const template = `localStorage window document`;',
          '// localStorage window document should not count',
          '/* localStorage window document should not count either */',
        ].join('\n');
      }

      return 'const note = `localStorage window document`;';
    });
    const readdirSync = jest.fn(dirPath => {
      if (dirPath === '/repo/src/core') {
        return [
          createDirentFile('match.js'),
          createDirentFile('notes.txt'),
          createDirentDirectory('nested'),
        ];
      }

      if (dirPath === '/repo/src/core/nested') {
        return [createDirentFile('ignore.js')];
      }

      return [];
    });

    expect(
      findCoreGlobalViolations({
        readFileSync,
        readdirSync,
        rootDir: '/repo',
        sourceRoot: 'src/core',
        pathModule: path,
      })
    ).toEqual([
      {
        filePath: 'src/core/match.js',
        globals: ['localStorage', 'window', 'document'],
      },
    ]);
  });
});

describe('createCheckDepcruiseHandle', () => {
  test('can be created without explicit options', () => {
    const handle = createCheckDepcruiseHandle({ pathModule: path });

    expect(typeof handle).toBe('function');
  });

  test('requires injected path helpers when options are omitted', () => {
    expect(() => createCheckDepcruiseHandle()).toThrow(
      'pathModule is required.'
    );
  });

  test('uses default options when none are provided', () => {
    const handle = createCheckDepcruiseHandle({ pathModule: path });

    expect(handle()).toEqual({ exitCode: 0, violations: 0 });
  });

  test('uses the default file reader when one is not provided', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readdirSync = jest.fn(() => [createDirentFile('default-reader.js')]);
    const handle = createCheckDepcruiseHandle({
      spawnImpl,
      readdirSync,
      stdout: createWriter(),
      stderr: createWriter(),
      rootDir: '/repo',
      pathModule: path,
    });

    expect(handle()).toEqual({ exitCode: 0, violations: 0 });
  });

  test('passes when dependency-cruiser succeeds and no core violations exist', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn();
    const readdirSync = jest.fn(() => []);
    const stdout = createWriter();
    const stderr = createWriter();
    const handle = createCheckDepcruiseHandle({
      spawnImpl,
      readFileSync,
      readdirSync,
      stdout,
      stderr,
      rootDir: '/repo',
      pathModule: path,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 0, violations: 0 });
    expect(spawnImpl).toHaveBeenCalledWith(
      'depcruise',
      ['--config', 'dependency-cruiser.config.cjs', 'src'],
      { cwd: '/repo', stdio: 'inherit' }
    );
    expect(stdout.chunks.join('')).toContain(
      'Checked dependency-cruiser: no core global dependencies.'
    );
    expect(stderr.chunks).toEqual([]);
  });

  test('fails when a core file uses Math.random directly', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn(() => 'const value = Math.random();\n');
    const readdirSync = jest.fn(() => [createDirentFile('random.js')]);
    const stdout = createWriter();
    const stderr = createWriter();
    const handle = createCheckDepcruiseHandle({
      spawnImpl,
      readFileSync,
      readdirSync,
      stdout,
      stderr,
      rootDir: '/repo',
      pathModule: path,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 1, violations: 1 });
    expect(stdout.chunks).toEqual([]);
    expect(stderr.chunks.join('')).toContain(
      'Dependency-cruiser core policy found 1 violation.'
    );
    expect(stderr.chunks.join('')).toContain(
      'src/core/random.js uses the injected random source directly 1 time.'
    );
  });

  test('detects browser globals in the core browser main entry when present', () => {
    const readFileSync = jest.fn(() =>
      [
        'export function createMainHandle() {',
        '  // localStorage should not count in comments',
        '  /* window should not count in block comments */',
        "  const singleQuoted = 'window should not count in single quotes';",
        '  const quotedDocument = "document should not count in strings";',
        '  const templatedStorage = `localStorage should not count in templates`;',
        '  const dependencyBag = { fetch: fetchFn, localStorage: storageObj };',
        'const storage = localStorage;',
        'window.addEventListener("load", () => {});',
        'document.addEventListener("click", () => {});',
        'return storage + quotedDocument + templatedStorage + singleQuoted + dependencyBag;',
        '}',
      ].join('\n')
    );

    expect(
      findCoreBrowserMainGlobalViolations({
        readFileSync,
        rootDir: '/repo',
        sourceRoot: 'src/core',
        pathModule: path,
      })
    ).toEqual([
      {
        filePath: 'src/core/browser/main.js',
        globals: ['localStorage', 'window', 'document'],
      },
    ]);
  });

  test('returns no browser-main violations when the entry is clean', () => {
    const readFileSync = jest.fn(() =>
      [
        'export function createMainHandle() {',
        '  const fetchFn = options.fetchFn;',
        '  return function handleMain() {',
        '    return fetchFn;',
        '  };',
        '}',
      ].join('\n')
    );

    expect(
      findCoreBrowserMainGlobalViolations({
        readFileSync,
        rootDir: '/repo',
        sourceRoot: 'src/core',
        pathModule: path,
      })
    ).toEqual([]);
  });

  test('returns false for browser globals that are not recognized by the policy', () => {
    expect(
      checkDepcruiseTestUtils.isBrowserGlobalAtIndex('crypto', 0, 'crypto')
    ).toBe(false);
  });

  test('recognizes browser globals through property and bare usage checks', () => {
    expect(
      checkDepcruiseTestUtils.isBrowserGlobalAtIndex(
        'window.addEventListener',
        0,
        'window'
      )
    ).toBe(true);
    expect(
      checkDepcruiseTestUtils.isBrowserGlobalAtIndex(
        'document.body',
        0,
        'document'
      )
    ).toBe(true);
    expect(
      checkDepcruiseTestUtils.isBrowserGlobalAtIndex('localStorage', 0, 'localStorage')
    ).toBe(true);
    expect(
      checkDepcruiseTestUtils.isBrowserGlobalAtIndex('fetch(', 0, 'fetch')
    ).toBe(true);
    expect(
      checkDepcruiseTestUtils.isBrowserGlobalAtIndex('fetch:', 0, 'fetch')
    ).toBe(false);
    expect(
      checkDepcruiseTestUtils.isBrowserGlobalAtIndex('localStorage:', 0, 'localStorage')
    ).toBe(false);
    expect(
      checkDepcruiseTestUtils.isBrowserGlobalAtIndex('window:', 0, 'window')
    ).toBe(false);
    expect(
      checkDepcruiseTestUtils.isBrowserGlobalAtIndex('foo', 0, 'window')
    ).toBe(false);
    expect(
      checkDepcruiseTestUtils.isBrowserGlobalAtIndex('foo', 0, 'fetch')
    ).toBe(false);
    expect(
      checkDepcruiseTestUtils.isBrowserGlobalAtIndex('foo', 0, 'localStorage')
    ).toBe(false);
  });

  test('recognizes fetch usage only for direct calls and shorthand values', () => {
    expect(
      checkDepcruiseTestUtils.hasFetchUsageAtIndex('fetch("/blog.json")', 0)
    ).toBe(true);
    expect(
      checkDepcruiseTestUtils.hasFetchUsageAtIndex('fetch.url', 0)
    ).toBe(
      false
    );
    expect(
      checkDepcruiseTestUtils.hasFetchUsageAtIndex('fetchx', 0)
    ).toBe(
      false
    );
    expect(
      checkDepcruiseTestUtils.hasFetchUsageAtIndex('fetch', 0)
    ).toBe(
      false
    );
    expect(
      checkDepcruiseTestUtils.hasFetchUsageAtIndex('fetch:', 0)
    ).toBe(
      false
    );
  });

  test('reports browser-global violations through the dependency-cruiser gate', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn(filePath => {
      if (filePath === '/repo/src/core/global-usage.js') {
        return [
          'export function handle() {',
          '  const storage = localStorage;',
          '  const response = fetch("/blog.json");',
          '  window.addEventListener("load", () => {});',
          '  document.addEventListener("click", () => {});',
          '  return storage + response;',
          '}',
        ].join('\n');
      }

      return '';
    });
    const readdirSync = jest.fn(dirPath => {
      if (dirPath === '/repo/src/core') {
        return [createDirentFile('global-usage.js')];
      }

      return [];
    });
    const stdout = createWriter();
    const stderr = createWriter();
    const handle = createCheckDepcruiseHandle({
      spawnImpl,
      readFileSync,
      readdirSync,
      stdout,
      stderr,
      rootDir: '/repo',
      sourceRoot: 'src/core',
      pathModule: path,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 1, violations: 1 });
    expect(stdout.chunks).toEqual([]);
    expect(stderr.chunks.join('')).toContain(
      'Dependency-cruiser core global policy found 1 violation.'
    );
    expect(stderr.chunks.join('')).toContain(
      'src/core/global-usage.js uses browser globals directly: localStorage, window, document.'
    );
  });

  test('reports plural violations when multiple files violate the policy', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn(filePath => {
      if (filePath.endsWith('alpha.js')) {
        return 'const first = Math.random();\nconst second = Math.random();\n';
      }

      return 'const value = Math.random();\n';
    });
    const readdirSync = jest.fn(() => [
      createDirentFile('alpha.js'),
      createDirentFile('beta.js'),
    ]);
    const stdout = createWriter();
    const stderr = createWriter();
    const handle = createCheckDepcruiseHandle({
      spawnImpl,
      readFileSync,
      readdirSync,
      stdout,
      stderr,
      rootDir: '/repo',
      pathModule: path,
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 1, violations: 2 });
    expect(stderr.chunks.join('')).toContain(
      'Dependency-cruiser core policy found 2 violations.'
    );
    expect(stderr.chunks.join('')).toContain(
      'src/core/alpha.js uses the injected random source directly 2 times.'
    );
    expect(stderr.chunks.join('')).toContain(
      'src/core/beta.js uses the injected random source directly 1 time.'
    );
  });

  test('uses the default error writer when violations are found', () => {
    const spawnImpl = jest.fn(() => ({ status: 0, signal: null }));
    const readFileSync = jest.fn(() => 'const value = Math.random();\n');
    const readdirSync = jest.fn(() => [createDirentFile('default-stderr.js')]);
    const stdout = createWriter();
    const handle = createCheckDepcruiseHandle({
      spawnImpl,
      readFileSync,
      readdirSync,
      stdout,
      rootDir: '/repo',
      pathModule: path,
    });

    expect(handle()).toEqual({ exitCode: 1, violations: 1 });
    expect(stdout.chunks).toEqual([]);
  });

  test('reports launch failures and exit codes', () => {
    const readFileSync = jest.fn();
    const readdirSync = jest.fn(() => []);

    const errorResult = createCheckDepcruiseHandle({
      spawnImpl: jest.fn(() => ({ error: new Error('boom') })),
      readFileSync,
      readdirSync,
      stdout: createWriter(),
      stderr: createWriter(),
      rootDir: '/repo',
      pathModule: path,
    })();

    const signalWriter = createWriter();
    const signalResult = createCheckDepcruiseHandle({
      spawnImpl: jest.fn(() => ({ status: null, signal: 'SIGTERM' })),
      readFileSync,
      readdirSync,
      stdout: createWriter(),
      stderr: signalWriter,
      rootDir: '/repo',
      pathModule: path,
    })();

    const statusResult = createCheckDepcruiseHandle({
      spawnImpl: jest.fn(() => ({ status: 2, signal: null })),
      readFileSync,
      readdirSync,
      stdout: createWriter(),
      stderr: createWriter(),
      rootDir: '/repo',
      pathModule: path,
    })();

    const missingStatusResult = createCheckDepcruiseHandle({
      spawnImpl: jest.fn(() => ({ status: undefined, signal: null })),
      readFileSync,
      readdirSync,
      stdout: createWriter(),
      stderr: createWriter(),
      rootDir: '/repo',
      pathModule: path,
    })();

    expect(errorResult).toEqual({ exitCode: 1, violations: 0 });
    expect(signalResult).toEqual({ exitCode: 1, violations: 0 });
    expect(statusResult).toEqual({ exitCode: 2, violations: 0 });
    expect(missingStatusResult).toEqual({ exitCode: 1, violations: 0 });
    expect(signalWriter.chunks.join('')).toContain(
      'Dependency-cruiser gate was terminated by signal SIGTERM'
    );
  });

});
