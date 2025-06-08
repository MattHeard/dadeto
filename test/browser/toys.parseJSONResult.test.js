import { describe, it, expect } from '@jest/globals';
import { parseJSONResult } from '../helpers/parseJSONResult.js';

describe('parseJSONResult', () => {
  it('returns parsed object for valid JSON', () => {
    const obj = { a: 1 };
    const result = parseJSONResult(JSON.stringify(obj));
    expect(result).toEqual(obj);
  });

  it('returns null for invalid JSON', () => {
    const result = parseJSONResult('{ invalid');
    expect(result).toBeNull();
  });
});
