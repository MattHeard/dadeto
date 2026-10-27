import { parse } from '@babel/parser';
import { jest } from '@jest/globals';
import { buildFunctionDependencyGraph } from '../../../src/core/scripts/function-dependency-graph-core.js';

/**
 * Resolve only the known import fixtures without a platform path dependency.
 * @param {string} file Fixture caller path.
 * @param {string} source Fixture import string.
 * @returns {string} Controlled resolved path.
 */
function resolveFixtureImport(file, source) {
  const targets = new Map([
    ['src/core/consumer.js:./shared.js', 'src/core/shared.js'],
    ['src/main.js:./helper', 'src/helper'],
  ]);
  const target = targets.get(`${file}:${source}`);
  if (target === undefined) throw new Error('Unexpected fixture import');
  return target;
}

describe('buildFunctionDependencyGraph', () => {
  test('retains identifier and default parameter bindings without guessing destructured names', () => {
    const graph = buildFunctionDependencyGraph({
      resolveImportPath: resolveFixtureImport,
      files: [
        {
          path: 'bindings.js',
          source:
            'function caller(direct, fallback = () => {}, { ignored }) { direct(); fallback(); ignored(); }',
        },
      ],
      parse,
    });
    expect(graph.ignoredCalls).toEqual(
      expect.arrayContaining([
        {
          caller: 'bindings.js#caller',
          callee: 'direct',
          reason: 'injected-parameter',
        },
        {
          caller: 'bindings.js#caller',
          callee: 'fallback',
          reason: 'injected-parameter',
        },
      ])
    );
    expect(
      graph.ignoredCalls.some(
        call =>
          call.callee === 'ignored' && call.reason === 'injected-parameter'
      )
    ).toBe(false);
  });

  test('resolves a local call when the file has no import bindings', () => {
    const graph = buildFunctionDependencyGraph({
      resolveImportPath: resolveFixtureImport,
      files: [
        { path: 'local.js', source: 'export function local() { missing(); }' },
      ],
      parse,
    });
    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'local.js#local' }),
      ])
    );
  });

  test('handles a call from an AST file without an import-binding entry', () => {
    const graph = buildFunctionDependencyGraph({
      resolveImportPath: resolveFixtureImport,
      files: [{ path: 'no-imports.js', source: 'ignored' }],
      parse: () => ({
        type: 'Program',
        body: [
          {
            type: 'FunctionDeclaration',
            id: { name: 'caller' },
            params: [],
            body: {
              type: 'BlockStatement',
              body: [
                {
                  type: 'CallExpression',
                  callee: { type: 'Identifier', name: 'missing' },
                },
              ],
            },
          },
        ],
      }),
    });
    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'no-imports.js#caller' }),
      ])
    );
  });
});

describe('buildFunctionDependencyGraph imports and exports', () => {
  test('links calls to functions imported from another file', () => {
    const graph = buildFunctionDependencyGraph({
      resolveImportPath: resolveFixtureImport,
      files: [
        {
          path: 'src/core/shared.js',
          source: 'export function sharedFunction() {}',
        },
        {
          path: 'src/core/consumer.js',
          source:
            "import { sharedFunction } from './shared.js';\nexport function consumerFunction() { sharedFunction(); }",
        },
      ],
      parse,
    });

    expect(graph.edges).toContainEqual({
      source: 'src/core/consumer.js#consumerFunction',
      target: 'src/core/shared.js#sharedFunction',
      kind: 'direct-call',
    });
  });

  test('records exports, anonymous functions, and injected calls', () => {
    const graph = buildFunctionDependencyGraph({
      resolveImportPath: resolveFixtureImport,
      files: [
        {
          path: 'src/helper.js',
          source: `export default function defaultHelper() {}
export const namedHelper = () => {};
export const object = { objectHelper() {} };`,
        },
        {
          path: 'src/main.js',
          source: `import helper, { namedHelper as imported } from './helper';
import external from 'external-package';
export function main(injected, { method }) {
  injected(); injected.run();
  helper(); imported(); external(); method();
  function local() { local(); }
  return local;
}
const anonymous = function () {};
const computed = { ['ignored']() {} };`,
        },
      ],
      parse,
    });

    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'src/helper.js#defaultHelper',
          exported: true,
        }),
        expect.objectContaining({
          id: 'src/helper.js#namedHelper',
          exported: false,
        }),
        expect.objectContaining({
          id: 'src/main.js#main',
          exported: true,
        }),
        expect.objectContaining({ name: expect.stringMatching(/^anonymous/) }),
      ])
    );
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'src/main.js#main',
          target: 'src/helper.js#namedHelper',
        }),
      ])
    );
    expect(graph.ignoredCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'injected-parameter' }),
        expect.objectContaining({
          callee: 'injected.run',
          reason: 'injected-object-member',
        }),
      ])
    );
  });

  test('walks sparse AST nodes and preserves anonymous fallback names', () => {
    const graph = buildFunctionDependencyGraph({
      resolveImportPath: resolveFixtureImport,
      files: [{ path: 'sparse.js', source: 'ignored' }],
      parse: () => ({
        type: 'Program',
        loc: null,
        leadingComments: [],
        trailingComments: [],
        body: [
          null,
          1,
          {
            type: 'ObjectProperty',
            key: { name: 'propertyFn' },
            value: {
              type: 'FunctionExpression',
              id: null,
              params: [],
              body: { type: 'BlockStatement', body: [] },
            },
          },
          {
            type: 'VariableDeclarator',
            id: { name: 'variableFn' },
            init: {
              type: 'FunctionExpression',
              id: null,
              params: [],
              body: { type: 'BlockStatement', body: [] },
            },
          },
          {
            type: 'VariableDeclarator',
            id: {},
            init: {
              type: 'FunctionExpression',
              id: null,
              params: [],
              body: { type: 'BlockStatement', body: [] },
            },
          },
          {
            type: 'ObjectProperty',
            key: {},
            value: {
              type: 'FunctionExpression',
              id: null,
              params: null,
              body: { type: 'BlockStatement', body: [] },
            },
          },
        ],
        metadata: { type: 'Metadata', child: null },
      }),
    });

    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'sparse.js#propertyFn',
          line: null,
        }),
      ])
    );
  });

  test('handles incomplete import and call AST nodes conservatively', () => {
    const graph = buildFunctionDependencyGraph({
      resolveImportPath: resolveFixtureImport,
      files: [{ path: 'incomplete.js', source: 'ignored' }],
      parse: () => ({
        type: 'Program',
        body: [
          { type: null },
          {
            type: 'ImportDeclaration',
            source: null,
            specifiers: null,
          },
          {
            type: 'ImportDeclaration',
            specifiers: [
              { type: 'ImportSpecifier', local: null },
              { type: 'ImportSpecifier', local: { name: 'missingSource' } },
            ],
          },
          {
            type: 'FunctionDeclaration',
            id: { name: 'incomplete' },
            params: [
              { type: 'Identifier', name: 'object' },
              { type: 'Identifier' },
            ],
            body: {
              type: 'BlockStatement',
              body: [
                { type: 'CallExpression' },
                { type: 'CallExpression', callee: { type: 'Identifier' } },
                {
                  type: 'CallExpression',
                  callee: {
                    type: 'MemberExpression',
                    object: { type: 'Identifier', name: 'object' },
                    property: {},
                  },
                },
                {
                  type: 'CallExpression',
                  callee: {
                    type: 'MemberExpression',
                    object: { type: 'Identifier', name: 'other' },
                    property: { name: 'method' },
                  },
                },
              ],
            },
          },
        ],
      }),
    });

    expect(graph.ignoredCalls).toEqual([
      expect.objectContaining({
        callee: 'object.<computed>',
        reason: 'injected-object-member',
      }),
    ]);
  });
});

test('delegates relative imports to the injected resolver', () => {
  const resolveImportPath = jest.fn(() => 'virtual/target.js');
  const graph = buildFunctionDependencyGraph({
    files: [
      { path: 'virtual/target.js', source: 'export function target() {}' },
      {
        path: 'consumer/main.js',
        source:
          "import { target } from './logical-alias'; export function caller() { target(); }",
      },
    ],
    parse,
    resolveImportPath,
  });
  expect(resolveImportPath).toHaveBeenCalledWith(
    'consumer/main.js',
    './logical-alias'
  );
  expect(graph.edges).toContainEqual({
    source: 'consumer/main.js#caller',
    target: 'virtual/target.js#target',
    kind: 'direct-call',
  });
});

test('propagates resolver failures without inventing a fallback graph', () => {
  const failure = new Error('resolver failed');
  expect(() =>
    buildFunctionDependencyGraph({
      files: [
        {
          path: 'caller.js',
          source:
            "import { target } from './target'; function caller() { target(); }",
        },
      ],
      parse,
      resolveImportPath() {
        throw failure;
      },
    })
  ).toThrow(failure);
});
