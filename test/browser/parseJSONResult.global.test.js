import { describe, it, expect } from '@jest/globals';
import { parseJSONResult } from '../../src/browser/toys.js';

describe('parseJSONResult global', () => {
  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('not json')).toBeNull();
  });
});
