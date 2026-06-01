import escomplex from 'typhonjs-escomplex';
import { createCyclomaticFactorsHandle } from '../../src/core/build/cyclomatic-factors.js';

const { describeCyclomaticFactors } = createCyclomaticFactorsHandle({
  parser: escomplex,
  readInput: async () => '',
  stdout: {
    write() {},
  },
});

describe('Cyclomatic factors analyzer', () => {
  it('extracts branching hints for functions', () => {
    const code = `function summarize(items) {
  for (let index = 0; index < items.length; index += 1) {
    if (items[index].skip) {
      continue;
    }
  }

  for (const item of items) {
    if (item.active || item.pending) {
      continue;
    }
  }
  try {
    return items.length;
  } catch (error) {
    return 0;
  }
}

function decide(flag) {
  switch (flag) {
    case true:
      return "yes";
    default:
      return "no";
  }
}

const helper = (value) => (value ? value.done : false)
  ? value.success
  : false;

function validate(value) {
  return value === null || value === undefined || value === "";
}`;

    const factors = describeCyclomaticFactors(code);

    expect(factors.some(entry => entry.includes('for loop'))).toBe(true);
    expect(factors.some(entry => entry.includes('for-of loop'))).toBe(true);
    expect(factors.some(entry => entry.includes('if statement'))).toBe(true);
    expect(
      factors.some(entry =>
        entry.includes(
          'logical || (value === null || value === undefined || value === "")'
        )
      )
    ).toBe(true);
    expect(
      factors.some(entry =>
        entry.includes('logical || (value === null || value === undefined)')
      )
    ).toBe(true);
    expect(factors.some(entry => entry.includes('catch clause'))).toBe(true);
    expect(factors.some(entry => entry.includes('switch case'))).toBe(true);
    expect(factors.some(entry => entry.includes('ternary expression'))).toBe(
      true
    );
  });

  it('names additional function and property shapes', () => {
    const code = `
const objectName = {
  "quoted-method"(value) {
    while (value.ready) {
      value.count -= 1;
    }
  },
  plain(value) {
    for (const key in value) {
      value[key] = key;
    }
  }
};

class Example {
  #secret(value) {
    do {
      value -= 1;
    } while (value > 0);
  }
}

assigned.handler = function (value) {
  return value?.nested?.field || false;
};

export default function (value) {
  return value ? true : false;
}
`;

    const factors = describeCyclomaticFactors(code);

    expect(
      factors.some(entry => entry.includes('Function quoted-method'))
    ).toBe(true);
    expect(factors.some(entry => entry.includes('Function plain'))).toBe(true);
    expect(factors.some(entry => entry.includes('Function #secret'))).toBe(
      true
    );
    expect(
      factors.some(entry => entry.includes('Function assigned.handler'))
    ).toBe(true);
    expect(
      factors.some(entry => entry.includes('default export function'))
    ).toBe(true);
    expect(factors.some(entry => entry.includes('while loop'))).toBe(true);
    expect(factors.some(entry => entry.includes('for-in loop'))).toBe(true);
    expect(factors.some(entry => entry.includes('do-while loop'))).toBe(true);
  });

  it('runs the injected CLI handle and rejects non-string code', async () => {
    const writes = [];
    const handle = createCyclomaticFactorsHandle({
      parser: {
        parse() {
          return {
            type: 'Program',
            start: 0,
            end: 0,
            loc: { start: { line: 1 } },
            body: [
              {
                type: 'FunctionDeclaration',
                id: { type: 'Identifier', name: 'fake' },
                start: 0,
                end: 20,
                loc: { start: { line: 1 } },
                body: {
                  type: 'BlockStatement',
                  body: [
                    {
                      type: 'IfStatement',
                      start: 10,
                      end: 12,
                      loc: { start: { line: 2 } },
                    },
                  ],
                },
              },
            ],
          };
        },
      },
      readInput: async () => 'function fake() { if (x) return x; }',
      stdout: {
        write: output => writes.push(output),
      },
    });

    await handle.runFromCli();

    expect(JSON.parse(writes[0])).toEqual([
      'Function fake (line 1): if statement at line 2',
    ]);
    expect(() => handle.describeCyclomaticFactors(null)).toThrow(
      'code must be a string'
    );
  });

  it('handles anonymous and invalid AST branches from an injected parser', () => {
    const handle = createCyclomaticFactorsHandle({
      parser: {
        parse() {
          return {
            type: 'Program',
            body: [
              null,
              {
                type: 'FunctionExpression',
                start: 0,
                end: 10,
                loc: null,
                body: {
                  type: 'BlockStatement',
                  body: [
                    {
                      type: 'IfStatement',
                      start: 1,
                      end: 2,
                      loc: null,
                    },
                    {
                      type: 'LogicalExpression',
                      operator: '&&',
                      start: 50,
                      end: 50,
                      loc: { start: { line: 4 } },
                    },
                    {
                      type: 'LogicalExpression',
                      operator: '||',
                      start: 0,
                      end: 3,
                      loc: { start: { line: 5 } },
                    },
                  ],
                },
              },
              {
                type: 'FunctionExpression',
                parent: null,
                start: 20,
                end: 30,
                loc: { start: { line: 6 } },
                body: {
                  type: 'BlockStatement',
                  body: [
                    {
                      type: 'MemberExpression',
                      object: { type: 'ThisExpression' },
                      property: { type: 'Identifier', name: 'missing' },
                    },
                  ],
                },
              },
            ],
          };
        },
      },
      readInput: async () => '',
      stdout: {
        write() {},
      },
    });

    const factors = handle.describeCyclomaticFactors('   ');

    expect(factors).toEqual([
      'Anonymous function (unknown line): logical || at line 5',
      'Anonymous function (unknown line): if statement',
      'Anonymous function (unknown line): logical && at line 4',
    ]);
  });

  it('names parser edge-case parents and keys', () => {
    const handle = createCyclomaticFactorsHandle({
      parser: {
        parse() {
          return {
            type: 'Program',
            body: [
              {
                type: 'ObjectMethod',
                key: {
                  type: 'TSQualifiedName',
                  left: { type: 'Identifier', name: 'Namespace' },
                  right: { type: 'Identifier', name: 'method' },
                },
                start: 0,
                end: 1,
                loc: { start: { line: 1 } },
                body: {
                  type: 'BlockStatement',
                  body: [
                    {
                      type: 'IfStatement',
                      start: 1,
                      end: 2,
                      loc: { start: { line: 2 } },
                    },
                  ],
                },
              },
              {
                type: 'VariableDeclarator',
                id: {
                  type: 'MemberExpression',
                  object: { type: 'Identifier', name: 'module' },
                  property: null,
                },
                init: {
                  type: 'FunctionExpression',
                  start: 3,
                  end: 4,
                  loc: { start: { line: 3 } },
                  body: {
                    type: 'BlockStatement',
                    body: [
                      {
                        type: 'IfStatement',
                        start: 4,
                        end: 5,
                        loc: { start: { line: 4 } },
                      },
                    ],
                  },
                },
              },
              {
                type: 'Property',
                key: { type: 'Identifier', name: 'propertyHandler' },
                value: {
                  type: 'FunctionExpression',
                  start: 5,
                  end: 6,
                  loc: { start: { line: 5 } },
                  body: {
                    type: 'BlockStatement',
                    body: [
                      {
                        type: 'IfStatement',
                        start: 6,
                        end: 7,
                        loc: { start: { line: 6 } },
                      },
                    ],
                  },
                },
              },
              {
                type: 'ObjectMethod',
                key: {
                  type: 'Literal',
                  value: 'literalMethod',
                },
                start: 7,
                end: 8,
                loc: { start: { line: 7 } },
                body: {
                  type: 'BlockStatement',
                  body: [
                    {
                      type: 'IfStatement',
                      start: 8,
                      end: 9,
                      loc: { start: { line: 8 } },
                    },
                  ],
                },
              },
              {
                type: 'ObjectMethod',
                key: {
                  type: 'NumericLiteral',
                  value: 42,
                },
                start: 9,
                end: 10,
                loc: { start: { line: 9 } },
                body: {
                  type: 'BlockStatement',
                  body: [
                    {
                      type: 'IfStatement',
                      start: 10,
                      end: 11,
                      loc: { start: { line: 10 } },
                    },
                  ],
                },
              },
            ],
          };
        },
      },
      readInput: async () => '',
      stdout: {
        write() {},
      },
    });

    expect(handle.describeCyclomaticFactors('source')).toEqual([
      'Function Namespace.method (line 1): if statement at line 2',
      'Anonymous function (line 3): if statement at line 4',
      'Function propertyHandler (line 5): if statement at line 6',
      'Function literalMethod (line 7): if statement at line 8',
      'Function 42 (line 9): if statement at line 10',
    ]);
  });

  it('covers computed members, fallback keys, assignment parents, and long snippets', () => {
    const longSnippet = `if (${'x'.repeat(140)})`;
    const handle = createCyclomaticFactorsHandle({
      parser: {
        parse() {
          return {
            type: 'Program',
            body: [
              {
                type: 'ObjectMethod',
                key: { type: 'UnknownKey' },
                start: 0,
                end: 1,
                loc: { start: { line: 1 } },
                body: {
                  type: 'BlockStatement',
                  body: [
                    {
                      type: 'LogicalExpression',
                      operator: '&&',
                      start: 0,
                      end: longSnippet.length,
                      loc: { start: { line: 2 } },
                    },
                  ],
                },
              },
              {
                type: 'AssignmentExpression',
                left: {
                  type: 'MemberExpression',
                  object: { type: 'Identifier', name: 'target' },
                  computed: true,
                  property: { type: 'UnknownKey' },
                },
                right: {
                  type: 'FunctionExpression',
                  start: 3,
                  end: 4,
                  loc: { start: { line: 3 } },
                  body: {
                    type: 'BlockStatement',
                    body: [
                      {
                        type: 'IfStatement',
                        start: null,
                        end: 2,
                        loc: { start: { line: 4 } },
                      },
                    ],
                  },
                },
              },
              {
                type: 'ObjectProperty',
                key: { type: 'UnknownKey' },
                value: {
                  type: 'FunctionExpression',
                  start: 5,
                  end: 6,
                  loc: { start: { line: 5 } },
                  body: {
                    type: 'BlockStatement',
                    body: [
                      {
                        type: 'IfStatement',
                        start: 1,
                        end: 2,
                        loc: { start: { line: 6 } },
                      },
                    ],
                  },
                },
              },
              {
                type: 'AssignmentExpression',
                left: { type: 'UnknownKey' },
                right: {
                  type: 'FunctionExpression',
                  start: 7,
                  end: 8,
                  loc: { start: { line: 7 } },
                  body: {
                    type: 'BlockStatement',
                    body: [
                      {
                        type: 'IfStatement',
                        start: 7,
                        end: 8,
                        loc: { start: { line: 8 } },
                      },
                    ],
                  },
                },
              },
            ],
          };
        },
      },
      readInput: async () => '',
      stdout: {
        write() {},
      },
    });

    const factors = handle.describeCyclomaticFactors(longSnippet);

    expect(factors[0]).toContain('Anonymous function (line 1)');
    expect(factors[0]).toContain('xxx...');
    expect(
      factors.some(entry => entry.includes('Function target.[expr]'))
    ).toBe(true);
    expect(
      factors.some(entry => entry.includes('Anonymous function (line 5)'))
    ).toBe(true);
    expect(
      factors.some(entry => entry.includes('Anonymous function (line 7)'))
    ).toBe(true);
  });

  it('handles a root anonymous function AST', () => {
    const handle = createCyclomaticFactorsHandle({
      parser: {
        parse() {
          return {
            type: 'FunctionExpression',
            start: 0,
            end: 5,
            loc: { start: { line: 1 } },
            body: {
              type: 'BlockStatement',
              body: [
                {
                  type: 'IfStatement',
                  start: 1,
                  end: 2,
                  loc: { start: { line: 2 } },
                },
              ],
            },
          };
        },
      },
      readInput: async () => '',
      stdout: {
        write() {},
      },
    });

    expect(handle.describeCyclomaticFactors('if (value) {}')).toEqual([
      'Anonymous function (line 1): if statement at line 2',
    ]);
  });
});
