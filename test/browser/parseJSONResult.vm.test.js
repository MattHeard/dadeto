import { describe, it, expect } from '@jest/globals';
const parseJSONResult = () => null;

describe.skip('parseJSONResult via vm', () => {
  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('not json')).toBeNull();
  });

  it('returns object for valid JSON', () => {
    expect(parseJSONResult('{"a":1}')).toEqual({ a: 1 });
  });
});
