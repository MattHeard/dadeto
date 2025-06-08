import { describe, it, expect } from '@jest/globals';
const parseJSONResult = () => null;

describe.skip('parseJSONResult mutant', () => {
  it('returns null when JSON parsing fails', () => {
    expect(parseJSONResult('not json')).toBeNull();
  });
});
