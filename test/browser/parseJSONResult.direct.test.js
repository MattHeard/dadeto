import { describe, it, expect } from '@jest/globals';
import { parseJSONResult } from '../../src/browser/toys.js';

// Simple direct import tests to ensure mutation coverage

describe('parseJSONResult direct import', () => {
  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('not valid')).toBeNull();
  });

  it('parses valid JSON', () => {
    const obj = { foo: 1 };
    expect(parseJSONResult(JSON.stringify(obj))).toEqual(obj);
  });
});
