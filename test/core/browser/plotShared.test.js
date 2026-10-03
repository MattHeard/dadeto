import { describe, expect, test } from '@jest/globals';
import {
  numberOr,
  parseObjectPayload,
  stringOr,
  strokeSegments,
} from '../../../src/core/browser/plotShared.js';

describe('plotShared', () => {
  test('consumes segments lazily and strokes once with context receivers', () => {
    const calls = [];
    const context = {
      moveTo(x, y) {
        expect(this).toBe(context);
        calls.push(['move', x, y]);
      },
      lineTo(x, y) {
        expect(this).toBe(context);
        calls.push(['line', x, y]);
      },
      stroke() {
        expect(this).toBe(context);
        calls.push(['stroke']);
      },
    };
    /**
     *
     */
    /**
     * @yields {number[]} One segment for receiver and ordering assertions.
     */
    function* segments() {
      yield [1, 2, 3, 4];
      expect(calls).toEqual([
        ['move', 1, 2],
        ['line', 3, 4],
      ]);
      yield [5, 6, 7, 8];
    }
    expect(strokeSegments(context, segments())).toBeUndefined();
    expect(calls).toEqual([
      ['move', 1, 2],
      ['line', 3, 4],
      ['move', 5, 6],
      ['line', 7, 8],
      ['stroke'],
    ]);
    calls.length = 0;
    strokeSegments(context, []);
    expect(calls).toEqual([['stroke']]);
  });

  test('normalizes numbers and strings with fallbacks', () => {
    expect(numberOr(123, 0)).toBe(123);
    expect(numberOr(Number.NaN, 0)).toBe(0);
    expect(numberOr(Infinity, 0)).toBe(0);
    expect(numberOr('123', 0)).toBe(0);
    expect(stringOr('hello', 'fallback')).toBe('hello');
    expect(stringOr('', 'fallback')).toBe('fallback');
    expect(stringOr(123, 'fallback')).toBe('fallback');
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

  test('rejects invalid normalization candidates independently', () => {
    expect(numberOr(Number.POSITIVE_INFINITY, 11)).toBe(11);
    expect(stringOr({ value: 'not a string' }, 'fallback')).toBe('fallback');
    expect(stringOr({ length: 4 }, 'fallback')).toBe('fallback');
  });
});
