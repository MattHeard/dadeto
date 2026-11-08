import { describe, expect, it } from '@jest/globals';
import { parseWgs84Coordinates } from '../../../../src/logic/boundary/wgs84/coordinates.js';
import { wgs84Distance } from '../../../../src/adapters/wgs84.js';

describe('public WGS84 coordinate boundary', () => {
  it('preserves original coercion without imposing a new geographic restriction', () => {
    expect(parseWgs84Coordinates(' 12.5 ', 2n, null, false)).toEqual({
      ok: true,
      coordinates: [12.5, 2, 0, 0],
    });
    const result = parseWgs84Coordinates(NaN, Infinity, -Infinity, -0);
    expect(result).toEqual({
      ok: true,
      coordinates: [NaN, Infinity, -Infinity, -0],
    });
    expect(parseWgs84Coordinates(undefined, '', true, ['3'])).toEqual({
      ok: true,
      coordinates: [NaN, 0, 1, 3],
    });
  });

  it.each([0, 1, 2, 3])(
    'retains the original failure and stops coercion at position %s',
    position => {
      const trace = [];
      const error = new Error('coordinate failure');
      const values = [0, 1, 2, 3].map(index => ({
        [Symbol.toPrimitive]: hint => {
          trace.push([index, hint]);
          if (index === position) throw error;
          return index + 1;
        },
      }));
      expect(parseWgs84Coordinates(...values)).toEqual({ ok: false, error });
      expect(trace).toEqual(
        Array.from({ length: position + 1 }, (_, index) => [index, 'number'])
      );
      trace.length = 0;
      expect(() => wgs84Distance(...values)).toThrow(error);
      expect(trace).toEqual(
        Array.from({ length: position + 1 }, (_, index) => [index, 'number'])
      );
    }
  );

  it('preserves left-to-right successful coercion and routes the resulting numbers', () => {
    const trace = [];
    const values = [0, 0, 0, 1].map((value, index) => ({
      valueOf: () => {
        trace.push(index);
        return value;
      },
    }));
    expect(wgs84Distance(...values)).toBe(111319.4907932264);
    expect(trace).toEqual([0, 1, 2, 3]);
  });

  it('returns a structural outcome for Symbol coercion and propagates it publicly', () => {
    const result = parseWgs84Coordinates(Symbol('coordinate'), 0, 0, 1);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(TypeError);
    expect(() => wgs84Distance(Symbol('coordinate'), 0, 0, 1)).toThrow(
      TypeError
    );
  });
});
