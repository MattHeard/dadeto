import { describe, it, expect } from '@jest/globals';
import '../../src/browser/toys.js';

describe.skip('parseJSONResult mutant', () => {
  it('returns null when JSON parsing fails', () => {
    expect(parseJSONResult('not json')).toBeNull();
  });
});
