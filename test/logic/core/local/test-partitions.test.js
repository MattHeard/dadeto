import { partitionTests } from '../../../../src/logic/core/local/test-partitions.js';
import { parseTestShardSize } from '../../../../src/logic/boundary/local/test-shard-size.js';

describe('partitionTests with a proven positive bound', () => {
  it('returns no shards for no tests', () => {
    expect(partitionTests([], parseTestShardSize(1))).toEqual([]);
  });

  it.each([
    [1, [['a'], ['b'], ['c'], ['d'], ['e']]],
    [2, [['a', 'b'], ['c', 'd'], ['e']]],
    [
      3,
      [
        ['a', 'b', 'c'],
        ['d', 'e'],
      ],
    ],
    [5, [['a', 'b', 'c', 'd', 'e']]],
    [6, [['a', 'b', 'c', 'd', 'e']]],
    [2 ** 53, [['a', 'b', 'c', 'd', 'e']]],
  ])(
    'preserves input order and exact final-shard length for %p',
    (size, expected) => {
      expect(
        partitionTests(['a', 'b', 'c', 'd', 'e'], parseTestShardSize(size))
      ).toEqual(expected);
    }
  );

  it('keeps sparse holes in their original shards', () => {
    const tests = Array(5);
    tests[0] = 'a';
    tests[2] = 'c';
    tests[4] = 'e';
    const result = partitionTests(tests, parseTestShardSize(2));
    const first = Array(2);
    first[0] = 'a';
    const second = Array(2);
    second[0] = 'c';
    expect(result).toEqual([first, second, ['e']]);
    expect(Object.hasOwn(result[0], 1)).toBe(false);
    expect(Object.hasOwn(result[1], 1)).toBe(false);
    expect(result[0]).toHaveLength(2);
  });

  it('returns fresh arrays while retaining entries and the input', () => {
    const tests = Object.freeze(['a', 'b', 'c']);
    const result = partitionTests(tests, parseTestShardSize(2));
    expect(result).toEqual([['a', 'b'], ['c']]);
    expect(result[0]).not.toBe(tests);
    result[0][0] = 'changed';
    expect(tests).toEqual(['a', 'b', 'c']);
    expect(partitionTests(tests, parseTestShardSize(2))).toEqual([
      ['a', 'b'],
      ['c'],
    ]);
  });
});
