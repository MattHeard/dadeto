import { describe, test, expect } from '@jest/globals';
import { parseJSONResult } from '../../src/browser/toys.js';

describe('parseJSONResult empty string', () => {
  test('returns null when given an empty string', () => {
    expect(parseJSONResult('')).toBeNull();
  });
});
