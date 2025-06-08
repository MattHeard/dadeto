import { beforeAll, describe, test, expect } from '@jest/globals';
import { parseJSONResult } from '../helpers/parseJSONResult.js';

let fn;

beforeAll(() => {
  fn = parseJSONResult;
});

describe('parseJSONResult dynamic import', () => {
  test('returns null for invalid JSON', () => {
    expect(fn('{ invalid')).toBeNull();
  });

  test('returns object for valid JSON', () => {
    expect(fn('{"a":1}')).toEqual({ a: 1 });
  });
});
