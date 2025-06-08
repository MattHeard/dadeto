import { beforeAll, describe, it, expect } from '@jest/globals';
import '../../src/browser/toys.js';

let fn;

beforeAll(() => {
  fn = parseJSONResult;
});

describe.skip('parseJSONResult additional cases', () => {
  it('returns null for JSON with extra characters', () => {
    expect(fn('{"a":1} trailing')).toBeNull();
  });

  it('parses valid JSON with surrounding whitespace', () => {
    const obj = { foo: 'bar' };
    const json = `\n  ${JSON.stringify(obj)}  \n`;
    expect(fn(json)).toEqual(obj);
  });
});
