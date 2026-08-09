import { createComplexityProfileHandle } from '../../src/core/build/complexity-profile.js';

test('rejects line ranges with either missing endpoint', () => {
  const { buildComplexityProfile } = createComplexityProfileHandle({
    analyzer: { analyzeModule: () => ({ methods: [] }) },
    readSource: () => '',
    stdout: { write: () => {} },
    argv: ['node', 'script.js', 'before.js', 'after.js'],
  });

  expect(() =>
    buildComplexityProfile('source', { lineRange: { end: '2' } })
  ).toThrow('Invalid line range: undefined:2');
  expect(() =>
    buildComplexityProfile('source', { lineRange: { start: '2' } })
  ).toThrow('Invalid line range: 2:undefined');
});
