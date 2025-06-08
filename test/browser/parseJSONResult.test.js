import { describe, test, expect } from '@jest/globals';
import { parseJSONResult } from '../helpers/parseJSONResult.js';

describe('parseJSONResult', () => {
  test('returns null for invalid JSON', () => {
    expect(parseJSONResult('not json')).toBeNull();
  });

  test('returns object for valid JSON', () => {
    expect(parseJSONResult('{"a":1}')).toEqual({ a: 1 });
  });
});
