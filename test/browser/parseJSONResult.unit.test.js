import { describe, it, expect } from '@jest/globals';
import { parseJSONResult } from '../../src/browser/toys.js';

describe('parseJSONResult', () => {
  it('returns parsed object for valid JSON', () => {
    const obj = { a: 1 };
    expect(parseJSONResult(JSON.stringify(obj))).toEqual(obj);
  });

  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('invalid')).toBeNull();
  });
});
