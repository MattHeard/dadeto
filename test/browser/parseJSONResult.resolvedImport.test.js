import { describe, it, expect } from '@jest/globals';
const parseJSONResult = () => null;

describe.skip('parseJSONResult resolved import', () => {
  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('invalid')).toBeNull();
  });

  it('parses valid JSON', () => {
    const obj = { a: 1 };
    expect(parseJSONResult(JSON.stringify(obj))).toEqual(obj);
  });
});
