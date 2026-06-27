/* eslint-disable no-unused-vars */
import { describe, expect, test } from '@jest/globals';
import * as espree from 'espree';
import path from 'node:path';
import {
  createCheckOverexposedExportsHandle,
  findOverexposedExportViolations,
  checkOverexposedExportsTestOnly as helpers,
} from '../../../src/core/scripts/check-overexposed-exports.js';

/**
 * Create a fake file system for the script tests.
 * @param {Record<string, string>} files File contents keyed by path.
 * @returns {{ parse: Function, readFileSync: Function, readdirSync: Function, pathModule: typeof path, rootDir: string, sourceRoot: string, configPath: string }} Fake file-system adapter.
 */
function createFileSystem(files) {
  return {
    parse: (source, options) =>
      espree.parse(source, {
        ecmaVersion: options.ecmaVersion,
        sourceType: options.sourceType,
        loc: options.loc,
        range: options.range,
      }),
    readFileSync(filePath) {
      return files[filePath];
    },
    readdirSync(dirPath, options) {
      const prefix = dirPath.endsWith(path.sep)
        ? dirPath
        : `${dirPath}${path.sep}`;
      const seen = new Map();

      for (const filePath of Object.keys(files)) {
        if (!filePath.startsWith(prefix) || filePath === dirPath) {
          continue;
        }

        const relative = filePath.slice(prefix.length);
        const [entryName] = relative.split(path.sep);
        const fullEntryPath = path.join(dirPath, entryName);
        if (relative.includes(path.sep)) {
          seen.set(entryName, {
            name: entryName,
            isDirectory: () => true,
            isFile: () => false,
          });
          continue;
        }

        seen.set(entryName, {
          name: entryName,
          isDirectory: () => false,
          isFile: () => filePath.endsWith('.js'),
        });
      }

      return Array.from(seen.values());
    },
    pathModule: path,
    rootDir: '/repo',
    sourceRoot: 'src',
  };
}

describe('check-overexposed-exports', () => {
  const parse = (source, options) =>
    espree.parse(source, {
      ecmaVersion: options.ecmaVersion,
      sourceType: options.sourceType,
      loc: options.loc,
      range: options.range,
    });

  test('runs the handler and reports success when there are no violations', () => {
    const stdout = [];
    const stderr = [];
    const handle = createCheckOverexposedExportsHandle({
      readFileSync: () => '',
      readdirSync: () => [],
      stdout: { write: text => stdout.push(text) },
      stderr: { write: text => stderr.push(text) },
      rootDir: '/repo',
      sourceRoot: 'src',
      parse,
      pathModule: path,
    });

    expect(handle()).toEqual({ exitCode: 0, violations: 0 });
    expect(stdout.join('')).toContain('no over-exposed exports found');
    expect(stderr).toEqual([]);
  });

  test('skips files listed in the exemption baseline', () => {
    const stdout = [];
    const stderr = [];
    const handle = createCheckOverexposedExportsHandle({
      readFileSync: filePath =>
        ({
          '/repo/overexposed-exports-exemptions.json': JSON.stringify({
            exemptions: {
              'src/a.js': 'temporary baseline',
            },
          }),
          '/repo/src/a.js': `
            export function alpha() {
              return alpha();
            }
          `,
        })[filePath] ?? '',
      readdirSync: dirPath => {
        if (dirPath === '/repo/src') {
          return [
            {
              name: 'a.js',
              isDirectory: () => false,
              isFile: () => true,
            },
          ];
        }

        return [];
      },
      stdout: { write: text => stdout.push(text) },
      stderr: { write: text => stderr.push(text) },
      rootDir: '/repo',
      sourceRoot: 'src',
      parse,
      pathModule: path,
      configPath: 'overexposed-exports-exemptions.json',
    });

    expect(handle()).toEqual({ exitCode: 0, violations: 0 });
    expect(stdout.join('')).toContain('no over-exposed exports found');
    expect(stderr).toEqual([]);
  });

  test('uses default options when the handler is created without overrides', () => {
    const handle = createCheckOverexposedExportsHandle();

    expect(handle()).toEqual({ exitCode: 0, violations: 0 });
  });

  test('uses the default readFileSync when one is not provided', () => {
    const stderr = [];
    const handle = createCheckOverexposedExportsHandle({
      readdirSync: dirPath => {
        if (dirPath === '/repo/src') {
          return [
            {
              name: 'a.js',
              isDirectory: () => false,
              isFile: () => true,
            },
          ];
        }

        return [];
      },
      stdout: { write: () => {} },
      stderr: { write: text => stderr.push(text) },
      rootDir: '/repo',
      sourceRoot: 'src',
      parse,
      pathModule: path,
    });

    expect(handle()).toEqual({ exitCode: 0, violations: 0 });
    expect(stderr).toEqual([]);
  });

  test('uses the default path module when one is not provided', () => {
    const stderr = [];
    const handle = createCheckOverexposedExportsHandle({
      readFileSync: filePath =>
        ({
          '/repo/src/a.js': `
            export function alpha() {
              return alpha();
            }
          `,
        })[filePath] ?? '',
      readdirSync: dirPath => {
        if (dirPath === '/repo/src') {
          return [
            {
              name: 'a.js',
              isDirectory: () => false,
              isFile: () => true,
            },
          ];
        }

        return [];
      },
      stdout: { write: () => {} },
      stderr: { write: text => stderr.push(text) },
      rootDir: '/repo',
      sourceRoot: 'src',
      parse,
    });

    expect(handle()).toEqual({ exitCode: 1, violations: 1 });
    expect(stderr.join('')).toContain('/repo/src/a.js');
  });

  test('runs the handler and reports violations when present', () => {
    const stdout = [];
    const stderr = [];
    const handle = createCheckOverexposedExportsHandle({
      readFileSync: filePath =>
        ({
          '/repo/src/a.js': `
            export function alpha() {
              return alpha();
            }
          `,
        })[filePath] ?? '',
      readdirSync: dirPath => {
        if (dirPath === '/repo/src') {
          return [
            {
              name: 'a.js',
              isDirectory: () => false,
              isFile: () => true,
            },
          ];
        }

        return [];
      },
      stdout: { write: text => stdout.push(text) },
      stderr: { write: text => stderr.push(text) },
      rootDir: '/repo',
      sourceRoot: 'src',
      parse,
      pathModule: path,
    });

    expect(handle()).toEqual({ exitCode: 1, violations: 1 });
    expect(stderr.join('')).toContain(
      'alpha is exported but only used in its own file'
    );
  });

  test('flags exported functions that are only called in their own file', () => {
    const deps = createFileSystem({
      '/repo/src/a.js': `
        export function alpha() {
          return alpha;
        }
      `,
      '/repo/src/b.js': `
        import { alpha } from './a.js';
        export function useAlpha() {
          return alpha();
        }
      `,
      '/repo/src/c.js': `
        export function beta() {
          return beta();
        }
      `,
      '/repo/src/nested/d.js': `
        export function gamma() {
          return gamma();
        }
      `,
      '/repo/src/nested/entry.js': `
        export { gamma } from './d.js';
      `,
      '/repo/src/missing.js': `
        import { ghost } from './does-not-exist.js';
        ghost();
      `,
      '/repo/src/default.js': `
        export default () => 1;
      `,
    });

    expect(findOverexposedExportViolations(deps)).toEqual([
      {
        filePath: 'src/c.js',
        line: 2,
        column: 15,
        exportName: 'beta',
        ownCalls: 1,
      },
      {
        filePath: 'src/nested/d.js',
        line: 2,
        column: 15,
        exportName: 'gamma',
        ownCalls: 1,
      },
    ]);
  });

  test('resolves namespace imports to external uses', () => {
    const deps = createFileSystem({
      '/repo/src/a.js': `
        export function alpha() {
          return 1;
        }
      `,
      '/repo/src/b.js': `
        import * as api from './a.js';
        export function useAlpha() {
          return api.alpha();
        }
      `,
    });

    expect(findOverexposedExportViolations(deps)).toEqual([]);
  });

  test('keeps helper exports available for file analysis', () => {
    expect(helpers.makeUsageKey('/repo/src/a.js', 'alpha')).toBe(
      '/repo/src/a.js::alpha'
    );
    expect(helpers.isFunctionLike({ type: 'ArrowFunctionExpression' })).toBe(
      true
    );
    expect(helpers.isFunctionLike({ type: 'FunctionExpression' })).toBe(true);
    expect(helpers.isFunctionLike({ type: 'Identifier' })).toBe(false);
  });

  test('collects exported function declarations from the supported shapes', () => {
    const exports = [];
    helpers.collectExportedFunctionsFromDeclaration(
      {
        type: 'FunctionDeclaration',
        id: { type: 'Identifier', name: 'alpha' },
        loc: { start: { line: 2, column: 0 } },
      },
      exports
    );
    helpers.collectExportedFunctionsFromDeclaration(
      {
        type: 'VariableDeclaration',
        declarations: [
          {
            id: { type: 'Identifier', name: 'beta' },
            init: { type: 'ArrowFunctionExpression' },
            loc: { start: { line: 3, column: 0 } },
          },
          {
            id: { type: 'Identifier', name: 'ignored' },
            init: { type: 'Literal', value: 1 },
            loc: { start: { line: 4, column: 0 } },
          },
        ],
      },
      exports
    );
    helpers.collectExportedFunctionsFromDeclaration(
      {
        type: 'ExpressionStatement',
      },
      exports
    );
    helpers.collectExportedFunctionsFromDefault(
      {
        type: 'FunctionDeclaration',
        id: { type: 'Identifier', name: 'gamma' },
        loc: { start: { line: 5, column: 0 } },
      },
      exports
    );
    helpers.collectExportedFunctionsFromDefault(
      {
        type: 'ArrowFunctionExpression',
      },
      exports
    );
    helpers.collectExportedFunctionsFromDefault(
      {
        type: 'FunctionExpression',
      },
      exports
    );

    expect(exports).toEqual([
      { exportName: 'alpha', line: 2, column: 0 },
      { exportName: 'beta', line: 3, column: 0 },
      { exportName: 'gamma', line: 5, column: 0 },
    ]);
  });

  test('lists files recursively and resolves imports against the analyzed index', () => {
    const deps = createFileSystem({
      '/repo/src/a.js': 'export function alpha() { return 1; }',
      '/repo/src/nested/b.js': 'export function beta() { return 1; }',
    });

    expect(helpers.listJavaScriptFiles(deps, 'src').sort()).toEqual([
      '/repo/src/a.js',
      '/repo/src/nested/b.js',
    ]);
    expect(
      helpers.resolveImportSource(
        deps,
        '/repo/src/nested/c.js',
        './b.js',
        new Set(['/repo/src/nested/b.js'])
      )
    ).toBe('/repo/src/nested/b.js');
    expect(
      helpers.resolveImportSource(deps, '/repo/src/nested/c.js', './b.js')
    ).toBe('/repo/src/nested/b.js');
    expect(
      helpers.resolveImportSource(deps, '/repo/src/nested/c.js', 'pkg')
    ).toBe(null);
  });
});
