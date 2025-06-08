import { describe, it, expect } from '@jest/globals';
import '../../src/browser/toys.js';

describe.skip('parseJSONResult via file import', () => {
  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('invalid')).toBeNull();
  });

  it('returns object for valid JSON', () => {
    expect(parseJSONResult('{"a":1}')).toEqual({ a: 1 });
  });
});
