import { describe, test, expect } from '@jest/globals';
import { parseJSONResult } from '../../src/browser/toys.js';

describe('parseJSONResult', () => {
  test('returns null for invalid JSON', () => {
    expect(parseJSONResult('not json')).toBeNull();
  });

  test('returns object for valid JSON', () => {
    expect(parseJSONResult('{"a":1}')).toEqual({ a: 1 });
  });

  test('returns null for undefined input', () => {
    expect(parseJSONResult(undefined)).toBeNull();
  });
});
