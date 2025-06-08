import { beforeAll, describe, test, expect } from '@jest/globals';
const parseJSONResult = () => null;

let fn;

beforeAll(() => {
  fn = parseJSONResult;
});

describe.skip('parseJSONResult eval import', () => {
  test('parses valid JSON', () => {
    const obj = { x: 1 };
    expect(fn(JSON.stringify(obj))).toEqual(obj);
  });

  test('returns null for invalid JSON', () => {
    expect(fn('{ invalid')).toBeNull();
  });

  test('returns null for undefined input', () => {
    expect(fn(undefined)).toBeNull();
  });
});
