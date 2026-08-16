import { parse } from '@babel/parser';
import { buildFunctionDependencyGraph } from '../../../src/core/scripts/function-dependency-graph-core.js';

describe('buildFunctionDependencyGraph', () => {
  test('resolves a local call when the file has no import bindings', () => {
    const graph = buildFunctionDependencyGraph({
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
  test('links calls to functions imported from another file', () => {
    const graph = buildFunctionDependencyGraph({
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
