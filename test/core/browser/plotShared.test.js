import { describe, expect, test } from '@jest/globals';
import {
  numberOr,
  parseObjectPayload,
  stringOr,
} from '../../../src/core/browser/plotShared.js';

describe('plotShared', () => {
  test('normalizes numbers and strings with fallbacks', () => {
    expect(numberOr(123, 0)).toBe(123);
    expect(numberOr(Number.NaN, 0)).toBe(0);
    expect(stringOr('hello', 'fallback')).toBe('hello');
    expect(stringOr('', 'fallback')).toBe('fallback');
  });

  test('parses object payloads and rejects non-objects', () => {
    expect(parseObjectPayload('{"hello":"world"}', payload => payload)).toEqual(
      { hello: 'world' }
    );
    expect(parseObjectPayload('null', payload => payload)).toBeNull();
    expect(parseObjectPayload('[]', payload => payload)).toEqual([]);
    expect(parseObjectPayload('123', payload => payload)).toBeNull();
    expect(parseObjectPayload('not json', payload => payload)).toBeNull();
  });
});
