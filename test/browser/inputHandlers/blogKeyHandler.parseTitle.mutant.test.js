import { expect, test } from '@jest/globals';
import { blogKeyHandlerTestUtils } from '../../../src/core/browser/inputHandlers/blogKeyHandler.js';

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
