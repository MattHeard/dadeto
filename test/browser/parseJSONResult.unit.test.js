import { describe, test, expect } from '@jest/globals';
import { parseJSONResult } from '../../src/browser/toys.js';

describe('parseJSONResult', () => {
  test('returns null for invalid JSON', () => {
    expect(parseJSONResult('not-json')).toBeNull();
  });

  test('returns parsed object for valid JSON', () => {
    const obj = { a: 1 };
    expect(parseJSONResult(JSON.stringify(obj))).toEqual(obj);
  });

  test('ignores leading and trailing whitespace', () => {
    const obj = { b: 2 };
    const input = `\n  ${JSON.stringify(obj)}  \t`;
    expect(parseJSONResult(input)).toEqual(obj);
  });
});
