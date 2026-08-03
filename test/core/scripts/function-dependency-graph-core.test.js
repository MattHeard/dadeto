import { parse } from '@babel/parser';
import { buildFunctionDependencyGraph } from '../../../src/core/scripts/function-dependency-graph-core.js';

describe('buildFunctionDependencyGraph', () => {
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
});
