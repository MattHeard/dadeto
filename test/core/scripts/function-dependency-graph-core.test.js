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
});
