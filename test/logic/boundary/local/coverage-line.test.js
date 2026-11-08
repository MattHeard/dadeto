import { parseCoverageLine } from '../../../../src/logic/boundary/local/coverage-line.js';

describe('parseCoverageLine', () => {
  it.each([0, -0, -1, 1, 17, Number.MAX_SAFE_INTEGER, 2 ** 53])(
    'preserves integer %p without a new range restriction',
    value => {
      expect(parseCoverageLine(value)).toBe(value);
    }
  );

  it.each([
    undefined,
    null,
    true,
    false,
    '',
    '17',
    1.5,
    NaN,
    Infinity,
    -Infinity,
    1n,
    Symbol('line'),
    [],
    [17],
    {},
    new Number(17),
    () => 17,
  ])('defines non-coercing rejection for %p', value => {
    expect(parseCoverageLine(value)).toBeNull();
  });

  it('does not evaluate object conversion hooks', () => {
    const value = {
      valueOf() {
        throw new Error('coercion must remain lazy');
      },
    };
    expect(parseCoverageLine(value)).toBeNull();
  });
});
