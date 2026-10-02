import { expect, test } from '@jest/globals';
import { parseTime } from '../../src/core/object-minute-rental-search/search-core.js';
import { parseTime as parseRequestTime } from '../../src/core/object-minute-rental-search/request/index.js';

test('legacy timestamp API is the request boundary implementation', () => {
  expect(parseTime).toBe(parseRequestTime);
});

test.each([
  ['2026-10-02T08:00:00Z', 1790928000000],
  ['2026-10-02T10:00:00+02:00', 1790928000000],
  [{ toString: () => '2026-10-02T08:00:00Z' }, 1790928000000],
])(
  'coerces timestamp-compatible values without changing their instant: %s',
  (value, expected) => {
    expect(parseTime(value)).toBe(expected);
  }
);

test.each([undefined, null, '', 'not-a-time', NaN, Infinity])(
  'invalid timestamp coercion returns NaN: %s',
  value => {
    expect(parseTime(value)).toBeNaN();
  }
);

test('custom string-coercion errors propagate instead of becoming invalid dates', () => {
  const error = new Error('Cannot coerce timestamp');
  expect(() =>
    parseTime({
      toString: () => {
        throw error;
      },
    })
  ).toThrow(error);
});
