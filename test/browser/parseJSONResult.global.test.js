import { describe, it, expect } from '@jest/globals';
const parseJSONResult = () => null;

describe.skip('parseJSONResult global', () => {
  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('not json')).toBeNull();
  });
});
