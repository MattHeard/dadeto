import { expect, test } from '@jest/globals';
import { blogKeyHandlerTestUtils } from '../../../src/core/browser/inputHandlers/blogKeyHandler.js';

test.each(['  unchanged  ', undefined, 42, false])(
  'accepted title retains the second getter value %p',
  selected => {
    let reads = 0;
    const parsed = {
      get title() {
        reads++;
        return reads === 1 ? 'guard' : selected;
      },
    };
    expect(blogKeyHandlerTestUtils.parseTitle(parsed)).toBe(selected);
    expect(reads).toBe(2);
  }
);

test('rejected title never coerces its object or reads it twice', () => {
  let reads = 0;
  const parsed = {
    get title() {
      reads++;
      return {
        toString() {
          throw new Error('must not coerce a title');
        },
      };
    },
  };
  expect(blogKeyHandlerTestUtils.parseTitle(parsed)).toBe('');
  expect(reads).toBe(1);
});

test('parseLines trims and removes empty entries', () => {
  expect(blogKeyHandlerTestUtils.parseLines(' A\n\n B ')).toEqual(['A', 'B']);
});

test('parseLines turns nullish input into an empty list', () => {
  expect(blogKeyHandlerTestUtils.parseLines(null)).toEqual([]);
  expect(blogKeyHandlerTestUtils.parseLines(undefined)).toEqual([]);
});

test('parseTitle returns a string title unchanged', () => {
  expect(blogKeyHandlerTestUtils.parseTitle({ title: 'A title' })).toBe(
    'A title'
  );
});

test('parseTitle defaults non-string titles to empty', () => {
  expect(blogKeyHandlerTestUtils.parseTitle({ title: 42 })).toBe('');
});

test('parseTitle defaults missing titles to empty', () => {
  expect(blogKeyHandlerTestUtils.parseTitle({})).toBe('');
});
