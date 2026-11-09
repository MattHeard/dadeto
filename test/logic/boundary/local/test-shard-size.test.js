import { parseTestShardSize } from '../../../../src/logic/boundary/local/test-shard-size.js';

describe('parseTestShardSize', () => {
  it.each([
    1,
    2,
    199,
    200,
    201,
    Number.MAX_SAFE_INTEGER,
    2 ** 53,
    Number.MAX_VALUE,
  ])(
    'preserves positive integer %p without a safe-integer restriction',
    value => {
      expect(parseTestShardSize(value)).toBe(value);
    }
  );

  it.each([
    undefined,
    null,
    -0,
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    -Infinity,
    true,
    false,
    '',
    '2',
    1n,
    Symbol('size'),
    {},
    [],
    [2],
    new Number(2),
    () => 2,
  ])('returns the established default200 for %p without coercion', value => {
    expect(parseTestShardSize(value)).toBe(200);
  });

  it('does not invoke object coercion hooks', () => {
    const candidate = {
      valueOf() {
        throw new Error('coercion');
      },
      toString() {
        throw new Error('coercion');
      },
    };
    expect(parseTestShardSize(candidate)).toBe(200);
  });
});
