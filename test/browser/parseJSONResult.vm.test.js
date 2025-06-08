import { describe, it, expect } from '@jest/globals';
import { parseJSONResult } from '../../src/browser/toys.js';

describe('parseJSONResult via vm', () => {
  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('not json')).toBeNull();
  });

  it('returns object for valid JSON', () => {
    expect(parseJSONResult('{"a":1}')).toEqual({ a: 1 });
  });
});
