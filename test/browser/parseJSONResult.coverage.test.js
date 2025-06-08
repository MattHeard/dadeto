import { describe, it, expect } from '@jest/globals';
import '../../src/browser/toys.js';

describe.skip('parseJSONResult coverage', () => {
  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('invalid')).toBeNull();
  });

  it('returns object for valid JSON', () => {
    const obj = { a: 1 };
    expect(parseJSONResult(JSON.stringify(obj))).toEqual(obj);
  });
});
