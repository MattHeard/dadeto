import { jest } from '@jest/globals';
import {
  createCheckCoreParseHandle,
  checkCoreParseTestUtils,
} from '../../src/core/scripts/check-core-parse.js';

/**
 * @returns {{ chunks: string[], log: (text: string) => void, error: (text: string) => void }} Writer sink.
 */
function createWriter() {
  const chunks = [];
  return {
    chunks,
    log(text) {
      chunks.push(text);
    },
    error(text) {
      chunks.push(text);
    },
  };
}

/**
 * @param {Record<string, string>} files Virtual file contents.
 * @returns {{ readFileSync: jest.Mock, readdirSync: jest.Mock }} Virtual filesystem stub.
 */
function createFs(files) {
  return {
    readFileSync: jest.fn(filePath => files[filePath] ?? ''),
    readdirSync: jest.fn(dirPath => {
      const entries = Object.keys(files)
        .filter(filePath => filePath.startsWith(`${dirPath}/`))
        .map(filePath => filePath.slice(dirPath.length + 1).split('/')[0]);
      return [...new Set(entries)].map(name => ({
        name,
        isDirectory: () =>
          Object.keys(files).some(filePath =>
            filePath.startsWith(`${dirPath}/${name}/`)
          ),
        isFile: () => files[`${dirPath}/${name}`] !== undefined,
      }));
    }),
  };
}

describe('createCheckCoreParseHandle', () => {
  test('uses built-in defaults when called without options', () => {
    const result = createCheckCoreParseHandle()();

    expect(result).toEqual({ exitCode: 0, violations: [] });
  });

  test('uses the default path helpers during a real directory walk', () => {
    const fsModule = createFs({
      './src/core/index.js':
        'export function createMainHandle() { return parseRequest(); }',
    });
    const result = createCheckCoreParseHandle({
      fsModule,
      rootDir: '.',
      sourceRoot: 'src/core',
    })();

    expect(result).toEqual({ exitCode: 0, violations: [] });
  });

  test('exposes the default path helper functions through test utils', () => {
    const { defaultPathModule, normalizeOptions } = checkCoreParseTestUtils;
    const normalized = normalizeOptions();

    expect(defaultPathModule.join('a', 'b')).toBe('a/b');
    expect(defaultPathModule.resolve('a', 'b')).toBe('a/b');
    expect(defaultPathModule.relative('a', 'b')).toBe('b');
    expect(normalized.pathModule.join('x', 'y')).toBe('x/y');
  });

  test('passes when only boundary parsers are present', () => {
    const fsModule = createFs({
      '/repo/src/core/index.js':
        'export function createMainHandle() { return parseRequest(); }',
      '/repo/src/core/cloud/widget.js':
        'export function parseWidget(input) { return input; }',
    });
    const stdout = createWriter();
    const handle = createCheckCoreParseHandle({
      fsModule,
      pathModule: {
        join: (...segments) => segments.join('/'),
        resolve: (...segments) => segments.join('/'),
        relative: (_from, to) => to.replace('/repo/', ''),
        sep: '/',
      },
      stdout,
      rootDir: '/repo',
      sourceRoot: 'src/core',
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 0, violations: [] });
    expect(stdout.chunks.join('')).toContain(
      'Checked parse boundaries in src/core; no downstream validation helpers found.'
    );
  });

  test('skips files listed in the exemption baseline', () => {
    const fsModule = createFs({
      '/repo/core-parse-exemptions.json': JSON.stringify({
        exemptions: {
          'src/core/browser/admin-core.js': 'baseline',
        },
      }),
      '/repo/src/core/index.js':
        'export function createMainHandle() { return parseRequest(); }',
      '/repo/src/core/browser/admin-core.js':
        'function validatePayload(payload) { return payload; }',
    });
    const stdout = createWriter();
    const handle = createCheckCoreParseHandle({
      fsModule,
      pathModule: {
        join: (...segments) => segments.join('/'),
        resolve: (...segments) => segments.join('/'),
        relative: (_from, to) => to.replace('/repo/', ''),
        sep: '/',
      },
      stdout,
      rootDir: '/repo',
      sourceRoot: 'src/core',
      configPath: 'core-parse-exemptions.json',
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 0, violations: [] });
    expect(stdout.chunks.join('')).toContain(
      'Checked parse boundaries in src/core; no downstream validation helpers found.'
    );
  });

  test('treats a non-object exemption payload as empty', () => {
    const fsModule = createFs({
      '/repo/core-parse-exemptions.json': JSON.stringify('nope'),
      '/repo/src/core/index.js':
        'export function createMainHandle() { return parseRequest(); }',
    });
    const stdout = createWriter();
    const handle = createCheckCoreParseHandle({
      fsModule,
      pathModule: {
        join: (...segments) => segments.join('/'),
        resolve: (...segments) => segments.join('/'),
        relative: (_from, to) => to.replace('/repo/', ''),
        sep: '/',
      },
      stdout,
      rootDir: '/repo',
      sourceRoot: 'src/core',
      configPath: 'core-parse-exemptions.json',
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 0, violations: [] });
  });

  test('reads object-shaped exemption payloads', () => {
    const fsModule = createFs({
      '/repo/core-parse-exemptions.json': JSON.stringify({
        exemptions: { 'src/core/browser/admin-core.js': 'baseline' },
      }),
    });

    const exemptions = checkCoreParseTestUtils.readExemptions({
      fsModule,
      pathModule: {
        resolve: (...segments) => segments.join('/'),
      },
      rootDir: '/repo',
      configPath: 'core-parse-exemptions.json',
    });

    expect([...exemptions]).toEqual(['src/core/browser/admin-core.js']);
  });

  test('ignores non-JavaScript files during the directory walk', () => {
    const fsModule = createFs({
      '/repo/src/core/index.js':
        'export function createMainHandle() { return parseRequest(); }',
      '/repo/src/core/notes.txt': 'validate me not',
    });
    const stdout = createWriter();
    const handle = createCheckCoreParseHandle({
      fsModule,
      pathModule: {
        join: (...segments) => segments.join('/'),
        resolve: (...segments) => segments.join('/'),
        relative: (_from, to) => to.replace('/repo/', ''),
        sep: '/',
      },
      stdout,
      rootDir: '/repo',
      sourceRoot: 'src/core',
    });

    const result = handle();

    expect(result).toEqual({ exitCode: 0, violations: [] });
  });

  test('fails when a non-boundary core module defines validation helpers', () => {
    const fsModule = createFs({
      '/repo/src/core/index.js':
        'export function createMainHandle() { return parseRequest(); }',
      '/repo/src/core/payment-webhook-core.js':
        'export function parsePaymentWebhookEvent(payload) { return payload; }\nfunction validatePayload(payload) { return payload; }\nconst isValidPayload = payload => Boolean(payload);',
    });
    const stdout = createWriter();
    const handle = createCheckCoreParseHandle({
      fsModule,
      pathModule: {
        join: (...segments) => segments.join('/'),
        resolve: (...segments) => segments.join('/'),
        relative: (_from, to) => to.replace('/repo/', ''),
        sep: '/',
      },
      stdout,
      rootDir: '/repo',
      sourceRoot: 'src/core',
    });

    const result = handle();

    expect(result.exitCode).toBe(1);
    expect(result.violations).toEqual([
      { filePath: 'src/core/payment-webhook-core.js', name: 'validatePayload' },
      { filePath: 'src/core/payment-webhook-core.js', name: 'isValidPayload' },
    ]);
    expect(stdout.chunks.join('')).toContain(
      'src/core/payment-webhook-core.js contains downstream validation helper validatePayload; parse at the boundary instead.'
    );
  });
});
