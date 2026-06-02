import { describe, expect, test } from '@jest/globals';
import { tautologicalWrapperTestOnly as helpers } from '../../../src/core/lint/tautological-wrapper.js';

/**
 * Create a minimal AST-like node for helper tests.
 * @param {Record<string, unknown>} [overrides] Additional node properties.
 * @returns {Record<string, unknown>} Fake AST node.
 */
function createNode(overrides = {}) {
  return {
    loc: {
      start: {
        line: 5,
      },
    },
    parent: null,
    ...overrides,
  };
}

/**
 * Create a minimal source-code stub for comment-based helper tests.
 * @param {Array<Record<string, unknown>>} [comments] Comments returned before the node.
 * @param {Array<Record<string, unknown>>} [ancestors] Ancestors returned for node lookups.
 * @returns {{ getCommentsBefore: () => Array<Record<string, unknown>>, getAncestors: () => Array<Record<string, unknown>> }} Fake source code helper.
 */
function createSourceCode(comments = [], ancestors = []) {
  return {
    getCommentsBefore: () => comments,
    getAncestors: () => ancestors,
  };
}

describe('tautological-wrapper helper coverage', () => {
  test('reads returned expressions from the supported shapes', () => {
    const arrowExpression = {
      type: 'ArrowFunctionExpression',
      body: {
        type: 'Identifier',
        name: 'value',
      },
    };

    const arrowBlock = {
      type: 'ArrowFunctionExpression',
      body: {
        type: 'BlockStatement',
        body: [
          {
            type: 'ReturnStatement',
            argument: { type: 'Identifier', name: 'value' },
          },
        ],
      },
    };

    const functionBlock = {
      type: 'FunctionExpression',
      body: { type: 'BlockStatement', body: [] },
    };
    const functionExpressionBody = {
      type: 'FunctionDeclaration',
      body: { type: 'Identifier', name: 'value' },
    };

    expect(helpers.getReturnedExpression(arrowExpression)).toEqual({
      type: 'Identifier',
      name: 'value',
    });
    expect(helpers.getReturnedExpression(arrowBlock)).toEqual({
      type: 'Identifier',
      name: 'value',
    });
    expect(helpers.getReturnedExpression(functionBlock)).toBe(null);
    expect(helpers.getReturnedExpression(functionExpressionBody)).toBe(null);
  });

  test('extracts the single returned expression only when the body is trivial', () => {
    expect(helpers.getSingleReturnExpression([])).toBe(null);
    expect(
      helpers.getSingleReturnExpression([{ type: 'ExpressionStatement' }])
    ).toBe(null);
    expect(
      helpers.getSingleReturnExpression([
        { type: 'ReturnStatement', argument: null },
      ])
    ).toBe(null);
    expect(
      helpers.getSingleReturnExpression([
        { type: 'ReturnStatement', argument: { type: 'Literal', value: 1 } },
      ])
    ).toEqual({ type: 'Literal', value: 1 });
  });

  test('recognizes imported callees and forwarded arguments', () => {
    expect(
      helpers.isImportedCallee(
        { type: 'Identifier', name: 'forward' },
        new Set(['forward'])
      )
    ).toBe(true);
    expect(
      helpers.isImportedCallee(
        {
          type: 'MemberExpression',
          computed: false,
          object: { type: 'Identifier', name: 'api' },
          property: { type: 'Identifier', name: 'forward' },
        },
        new Set(['api'])
      )
    ).toBe(true);
    expect(
      helpers.isImportedCallee(
        {
          type: 'MemberExpression',
          computed: true,
          object: { type: 'Identifier', name: 'api' },
          property: { type: 'Literal', value: 'forward' },
        },
        new Set(['api'])
      )
    ).toBe(false);

    expect(
      helpers.doArgumentsMatchParameters(
        [{ type: 'Identifier', name: 'value' }],
        [{ type: 'Identifier', name: 'value' }]
      )
    ).toBe(true);
    expect(
      helpers.doArgumentsMatchParameters(
        [{ type: 'Identifier', name: 'value' }],
        [{ type: 'Identifier', name: 'other' }]
      )
    ).toBe(false);
    expect(
      helpers.doArgumentsMatchParameters(
        [
          { type: 'Identifier', name: 'first' },
          { type: 'Identifier', name: 'second' },
        ],
        [{ type: 'Identifier', name: 'first' }]
      )
    ).toBe(false);
    expect(
      helpers.doArgumentsMatchParameters(
        [
          {
            type: 'RestElement',
            argument: { type: 'Identifier', name: 'args' },
          },
        ],
        [
          {
            type: 'SpreadElement',
            argument: { type: 'Identifier', name: 'args' },
          },
        ]
      )
    ).toBe(true);
    expect(
      helpers.doArgumentsMatchParameters(
        [
          {
            type: 'RestElement',
            argument: { type: 'Identifier', name: 'args' },
          },
        ],
        [{ type: 'Identifier', name: 'args' }]
      )
    ).toBe(false);
  });

  test('reads function and callee names from every supported shape', () => {
    expect(
      helpers.getDeclaredFunctionName({
        type: 'FunctionDeclaration',
        id: { type: 'Identifier', name: 'wrap' },
      })
    ).toBe('wrap');
    expect(
      helpers.getDeclaredFunctionName({
        type: 'FunctionExpression',
        id: { type: 'Identifier', name: 'wrap' },
      })
    ).toBe('wrap');

    expect(
      helpers.getAssignedFunctionName(
        createNode({
          parent: {
            type: 'VariableDeclarator',
            id: { type: 'Identifier', name: 'wrap' },
          },
        })
      )
    ).toBe('wrap');
    expect(
      helpers.getAssignedFunctionName(
        createNode({
          parent: {
            type: 'AssignmentExpression',
            left: { type: 'Identifier', name: 'wrap' },
          },
        })
      )
    ).toBe('wrap');

    expect(
      helpers.getPropertyFunctionName(
        createNode({
          parent: {
            type: 'Property',
            computed: false,
            key: { type: 'Identifier', name: 'wrap' },
          },
        })
      )
    ).toBe('wrap');
    expect(
      helpers.getPropertyFunctionName(
        createNode({
          parent: {
            type: 'Property',
            computed: false,
            key: { type: 'Literal', value: 'wrap' },
          },
        })
      )
    ).toBe('wrap');
    expect(
      helpers.getPropertyKeyName({ type: 'Identifier', name: 'wrap' })
    ).toBe('wrap');
    expect(helpers.getPropertyKeyName({ type: 'Literal', value: 'wrap' })).toBe(
      'wrap'
    );
    expect(
      helpers.getPropertyKeyName({
        type: 'PrivateIdentifier',
        name: 'wrap',
      })
    ).toBe(null);

    expect(helpers.getFunctionName(createNode())).toBe(null);
    expect(helpers.getCalleeName({ type: 'Identifier', name: 'forward' })).toBe(
      'forward'
    );
    expect(
      helpers.getCalleeName({
        type: 'MemberExpression',
        computed: false,
        object: { type: 'Identifier', name: 'api' },
        property: { type: 'Identifier', name: 'forward' },
      })
    ).toBe('forward');
    expect(
      helpers.getCalleeName({
        type: 'MemberExpression',
        computed: false,
        object: { type: 'Identifier', name: 'api' },
        property: { type: 'Literal', value: 'forward' },
      })
    ).toBe('forward');
    expect(
      helpers.getCalleeName({
        type: 'MemberExpression',
        computed: true,
        object: { type: 'Identifier', name: 'api' },
        property: { type: 'Literal', value: 'forward' },
      })
    ).toBe(null);
    expect(
      helpers.getCalleeName({
        type: 'MemberExpression',
        computed: false,
        object: { type: 'Identifier', name: 'api' },
        property: { type: 'Literal', value: 42 },
      })
    ).toBe(null);
    expect(
      helpers.functionNameMatchesCallee(createNode(), {
        type: 'Identifier',
        name: 'wrap',
      })
    ).toBe(false);
  });

  test('respects documented exemptions and exported boundaries', () => {
    const comment = {
      loc: {
        end: { line: 4 },
      },
      value: ' tautological-wrapper: allow ',
    };

    expect(
      helpers.hasDocumentedExemption(
        createNode({ loc: { start: { line: 5 } } }),
        createSourceCode([comment])
      )
    ).toBe(true);
    expect(
      helpers.hasDocumentedExemption(
        createNode({ loc: { start: { line: 7 } } }),
        createSourceCode([comment])
      )
    ).toBe(false);
    expect(
      helpers.hasDocumentedExemption(
        /** @type {any} */ (createNode({ loc: null })),
        createSourceCode([comment])
      )
    ).toBe(false);
    expect(helpers.isExportedFunction(createNode(), createSourceCode())).toBe(
      false
    );
    expect(
      helpers.isExportedFunction(
        createNode(),
        createSourceCode([], [{ type: 'ExportNamedDeclaration' }])
      )
    ).toBe(true);
    expect(helpers.isExportBoundary({ type: 'ExportDefaultDeclaration' })).toBe(
      true
    );
  });

  test('skips unsupported wrapper shapes and detects tautological wrappers', () => {
    const sourceCode = createSourceCode();

    expect(
      helpers.shouldSkipWrapperCheck(
        createNode({ async: true, body: { type: 'BlockStatement', body: [] } }),
        sourceCode
      )
    ).toBe(true);
    expect(
      helpers.shouldSkipWrapperCheck(
        createNode({
          generator: true,
          body: { type: 'BlockStatement', body: [] },
        }),
        sourceCode
      )
    ).toBe(true);
    expect(
      helpers.isTautologicalWrapper(
        {
          type: 'FunctionDeclaration',
          async: false,
          generator: false,
          params: [{ type: 'Identifier', name: 'value' }],
          body: {
            type: 'BlockStatement',
            body: [
              {
                type: 'ReturnStatement',
                argument: { type: 'Identifier', name: 'value' },
              },
            ],
          },
          parent: {
            type: 'ExportNamedDeclaration',
            parent: null,
          },
        },
        sourceCode,
        new Set(['forward'])
      )
    ).toBe(false);
    expect(
      helpers.isTautologicalWrapper(
        {
          type: 'ArrowFunctionExpression',
          async: false,
          generator: false,
          params: [{ type: 'Identifier', name: 'value' }],
          body: {
            type: 'CallExpression',
            callee: { type: 'Identifier', name: 'forward' },
            arguments: [{ type: 'Identifier', name: 'value' }],
          },
          parent: {
            type: 'VariableDeclarator',
            id: { type: 'Identifier', name: 'wrap' },
          },
        },
        sourceCode,
        new Set(['forward'])
      )
    ).toBe(true);
    expect(
      helpers.isTautologicalWrapper(
        {
          type: 'ArrowFunctionExpression',
          async: false,
          generator: false,
          params: [{ type: 'Identifier', name: 'value' }],
          body: {
            type: 'CallExpression',
            callee: { type: 'Identifier', name: 'forward' },
            arguments: [{ type: 'Identifier', name: 'value' }],
          },
          parent: {
            type: 'VariableDeclarator',
            id: { type: 'Identifier', name: 'forward' },
          },
        },
        sourceCode,
        new Set(['forward'])
      )
    ).toBe(false);
    expect(
      helpers.isTautologicalWrapper(
        {
          type: 'ArrowFunctionExpression',
          async: false,
          generator: false,
          params: [{ type: 'Identifier', name: 'value' }],
          body: {
            type: 'CallExpression',
            callee: { type: 'Identifier', name: 'localHelper' },
            arguments: [{ type: 'Identifier', name: 'value' }],
          },
          parent: {
            type: 'VariableDeclarator',
            id: { type: 'Identifier', name: 'wrap' },
          },
        },
        sourceCode,
        new Set()
      )
    ).toBe(false);
  });
});
