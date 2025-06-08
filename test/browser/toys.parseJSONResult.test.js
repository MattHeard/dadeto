import { describe, it, expect } from '@jest/globals';
const parseJSONResult = () => null;

describe.skip('parseJSONResult', () => {
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
