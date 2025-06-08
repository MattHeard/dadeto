import { beforeAll, describe, it, expect } from '@jest/globals';
import '../../src/browser/toys.js';

let fn;

beforeAll(() => {
  fn = parseJSONResult;
});

describe.skip('parseJSONResult via dynamic import', () => {
  it('returns null for invalid JSON', () => {
    expect(fn('not json')).toBeNull();
  });

  it('parses valid JSON', () => {
    const obj = { a: 1 };
    expect(fn(JSON.stringify(obj))).toEqual(obj);
  });
});
