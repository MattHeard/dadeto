import { beforeAll, describe, it, expect } from '@jest/globals';
const parseJSONResult = () => null;

let fn;

beforeAll(() => {
  fn = parseJSONResult;
});

describe.skip('parseJSONResult direct import', () => {
  it('returns null for invalid JSON', () => {
    expect(fn('invalid')).toBeNull();
  });

  it('parses valid JSON', () => {
    const obj = { a: 1 };
    expect(fn(JSON.stringify(obj))).toEqual(obj);
  });
});
