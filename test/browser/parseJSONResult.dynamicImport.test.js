import { describe, test, expect } from '@jest/globals';
import { parseJSONResult } from '../../src/browser/toys.js';

describe('parseJSONResult dynamic import', () => {
  test('returns null for invalid JSON', () => {
    expect(parseJSONResult('{ invalid')).toBeNull();
  });

  test('returns object for valid JSON', () => {
    expect(parseJSONResult('{"a":1}')).toEqual({ a: 1 });
  });
});
