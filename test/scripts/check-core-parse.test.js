import { jest } from '@jest/globals';
import {
  createCheckCoreParseHandle,
  createCheckParseBoundaryHandle,
  createCheckParseNotValidateHandle,
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

/**
 * @param {{
 *   fsModule: { readFileSync: (filePath: string, encoding: 'utf8') => string, readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }> },
 *   stdout?: { chunks: string[], log: (text: string) => void, error: (text: string) => void },
 *   configPath?: string,
 * }} options Shared gate options.
 * @returns {{
 *   fsModule: { readFileSync: (filePath: string, encoding: 'utf8') => string, readdirSync: (dirPath: string, options: { withFileTypes: true }) => Array<{ isDirectory: () => boolean, isFile: () => boolean, name: string }> },
 *   pathModule: { join: (...segments: string[]) => string, resolve: (...segments: string[]) => string, relative: (_from: string, to: string) => string, sep: string },
 *   stdout: { chunks: string[], log: (text: string) => void, error: (text: string) => void },
 *   rootDir: string,
 *   sourceRoot: string,
 *   configPath: string,
 * }} Parsed options.
 */
function createOptions({
  fsModule,
  stdout = createWriter(),
  configPath = 'core-parse-exemptions.json',
}) {
  return {
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
    configPath,
  };
}

describe('parse gates', () => {
  test('default helpers work without options', () => {
    expect(createCheckCoreParseHandle()()).toEqual({
      exitCode: 0,
      violations: [],
    });
    expect(createCheckParseNotValidateHandle()()).toEqual({
      exitCode: 0,
      violations: [],
    });
    expect(createCheckParseBoundaryHandle()()).toEqual({
      exitCode: 0,
      violations: [],
    });
  });

  test('default path helpers are exposed through test utils', () => {
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
    const result = createCheckCoreParseHandle(
      createOptions({ fsModule, stdout })
    )();

    expect(result).toEqual({ exitCode: 0, violations: [] });
    expect(stdout.chunks.join('')).toContain('Checked parse');
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
    const result = createCheckParseNotValidateHandle(
      createOptions({ fsModule, stdout })
    )();

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

    const result = createCheckParseBoundaryHandle(
      createOptions({ fsModule })
    )();

    expect(result).toEqual({ exitCode: 0, violations: [] });
  });

  test('parse-not-validate fails on validation helpers outside boundary modules', () => {
    const fsModule = createFs({
      '/repo/src/core/index.js':
        'export function createMainHandle() { return parseRequest(); }',
      '/repo/src/core/payment-webhook-core.js':
        'export function parsePaymentWebhookEvent(payload) { return payload; }\nfunction validatePayload(payload) { return payload; }\nconst isValidPayload = payload => Boolean(payload);',
    });
    const stdout = createWriter();
    const result = createCheckParseNotValidateHandle(
      createOptions({ fsModule, stdout })
    )();

    expect(result.exitCode).toBe(1);
    expect(result.violations).toEqual([
      { filePath: 'src/core/payment-webhook-core.js', name: 'validatePayload' },
      { filePath: 'src/core/payment-webhook-core.js', name: 'isValidPayload' },
    ]);
    expect(stdout.chunks.join('')).toContain(
      'contains validation helper validatePayload'
    );
  });

  test('parse-boundary fails on raw-input interpretation outside boundary modules', () => {
    const fsModule = createFs({
      '/repo/src/core/index.js':
        'export function createMainHandle() { return parseRequest(); }',
      '/repo/src/core/payment-webhook-core.js':
        'export function parsePaymentWebhookEvent(request) {\n  const raw = request.body;\n  const env = process.env.SHOULD_PARSE;\n  const params = new URLSearchParams(request.queryString);\n  const data = JSON.parse(raw);\n  const hasId = "id" in data;\n  return { raw, env, params, data, hasId };\n}',
    });
    const stdout = createWriter();
    const result = createCheckParseBoundaryHandle(
      createOptions({ fsModule, stdout })
    )();

    expect(result.exitCode).toBe(1);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        {
          filePath: 'src/core/payment-webhook-core.js',
          label: 'request.body access',
        },
        {
          filePath: 'src/core/payment-webhook-core.js',
          label: 'process.env access',
        },
        {
          filePath: 'src/core/payment-webhook-core.js',
          label: 'URLSearchParams',
        },
      ])
    );
    expect(stdout.chunks.join('')).toContain('raw-input interpretation');
  });
});
