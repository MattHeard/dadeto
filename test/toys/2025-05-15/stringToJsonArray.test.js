import { describe, test, expect } from '@jest/globals';
import { stringToJsonArrayToy } from '../../../src/core/browser/toys/2025-05-15/stringToJsonArray.js';

describe('stringToJsonArrayToy', () => {
  test('converts comma-delimited string to JSON array', () => {
    const input = 'apple, banana, cherry';
    const expected = JSON.stringify(['apple', 'banana', 'cherry']);
    expect(stringToJsonArrayToy(input)).toBe(expected);
  });

  test('handles extra whitespace and empty values', () => {
    const input = '  apple , , banana , cherry  ';
    const expected = JSON.stringify(['apple', 'banana', 'cherry']);
    expect(stringToJsonArrayToy(input)).toBe(expected);
  });

  test('returns empty array for empty string', () => {
    const input = '';
    const expected = JSON.stringify([]);
    expect(stringToJsonArrayToy(input)).toBe(expected);
  });

  test('returns empty array for non-string input', () => {
    const input = null;
    const expected = JSON.stringify([]);
    expect(stringToJsonArrayToy(input)).toBe(expected);
  });

  test('handles single value', () => {
    const input = 'apple';
    const expected = JSON.stringify(['apple']);
    expect(stringToJsonArrayToy(input)).toBe(expected);
  });

  test('handles values with internal commas', () => {
    const input = 'apple, banana, cherry pie, grape';
    const expected = JSON.stringify(['apple', 'banana', 'cherry pie', 'grape']);
    expect(stringToJsonArrayToy(input)).toBe(expected);
  });
});
