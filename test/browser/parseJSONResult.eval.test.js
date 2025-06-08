import { describe, test, expect } from '@jest/globals';
import { parseJSONResult } from '../../src/browser/toys.js';

describe('parseJSONResult eval import', () => {
  test('parses valid JSON', () => {
    const obj = { x: 1 };
    expect(parseJSONResult(JSON.stringify(obj))).toEqual(obj);
  });

  test('returns null for invalid JSON', () => {
    expect(parseJSONResult('{ invalid')).toBeNull();
  });

  test('returns null for undefined input', () => {
    expect(parseJSONResult(undefined)).toBeNull();
  });
});
