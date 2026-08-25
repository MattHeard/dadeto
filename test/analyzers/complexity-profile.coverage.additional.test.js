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
  expect(() =>
    buildComplexityProfile('source', { lineRange: { start: '0', end: '2' } })
  ).toThrow('Invalid line range: 0:2');
  expect(() =>
    buildComplexityProfile('source', { lineRange: { start: 'x', end: '2' } })
  ).toThrow('Invalid line range: x:2');
});

test('filters range boundaries and sorts by excess, cyclomatic, then line', () => {
  const { buildComplexityProfile } = createComplexityProfileHandle({
    analyzer: {
      analyzeModule: () => ({
        methods: [
          { name: 'sameLineLate', lineStart: 10, lineEnd: 10, cyclomatic: 5 },
          { name: 'sameLineEarly', lineStart: 2, lineEnd: 10, cyclomatic: 5 },
          { name: 'higherExcess', lineStart: 20, lineEnd: 20, cyclomatic: 7 },
          { name: 'outsideBefore', lineStart: 1, lineEnd: 3, cyclomatic: 9 },
          { name: 'outsideAfter', lineStart: 30, lineEnd: 40, cyclomatic: 9 },
        ],
      }),
    },
    readSource: () => '',
    stdout: { write: () => {} },
    argv: ['node', 'script.js', 'before.js', 'after.js'],
  });

  const profile = buildComplexityProfile('source', {
    threshold: 2,
    lineRange: { start: '10', end: '20' },
  });

  expect(profile.methods.map(method => method.name)).toEqual([
    'higherExcess',
    'sameLineEarly',
    'sameLineLate',
  ]);
  expect(profile.summary).toEqual({
    methodCount: 3,
    warningCount: 3,
    peakCyclomatic: 7,
    totalExcess: 11,
  });
});

test('rejects non-positive CLI thresholds', () => {
  const handle = createComplexityProfileHandle({
    analyzer: { analyzeModule: () => ({ methods: [] }) },
    readSource: () => '',
    stdout: { write: () => {} },
    argv: ['node', 'script.js', '--threshold', '-1', 'a.js', 'b.js'],
  });

  expect(() => handle.runFromCli()).toThrow('Invalid threshold: -1');
});

test('accepts the minimum positive CLI threshold', () => {
  const handle = createComplexityProfileHandle({
    analyzer: { analyzeModule: () => ({ methods: [] }) },
    readSource: () => '',
    stdout: { write: () => {} },
    argv: ['node', 'script.js', '--threshold', '1', 'a.js', 'b.js'],
  });

  expect(() => handle.runFromCli()).not.toThrow();
});
