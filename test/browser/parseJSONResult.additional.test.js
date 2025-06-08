import { describe, it, expect } from '@jest/globals';
import { parseJSONResult } from '../../src/browser/toys.js';

describe('parseJSONResult additional cases', () => {
  it('returns null for JSON with extra characters', () => {
    expect(parseJSONResult('{"a":1} trailing')).toBeNull();
  });

  it('parses valid JSON with surrounding whitespace', () => {
    const obj = { foo: 'bar' };
    const json = `\n  ${JSON.stringify(obj)}  \n`;
    expect(parseJSONResult(json)).toEqual(obj);
  });
});
