import { describe, it, expect } from '@jest/globals';
import { parseJSONResult } from '../helpers/parseJSONResult.js';

describe('parseJSONResult mutant', () => {
  it('returns null when JSON parsing fails', () => {
    expect(parseJSONResult('not json')).toBeNull();
  });
});
