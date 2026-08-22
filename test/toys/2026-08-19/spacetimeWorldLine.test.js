import { describe, expect, test } from '@jest/globals';
import {
  parseInput,
  isJsonObject,
  spacetimeWorldLine,
} from '../../../src/core/browser/toys/2026-08-19/spacetimeWorldLine.js';

describe('spacetimeWorldLine', () => {
  test('orders every segment into a contiguous world line', () => {
    const result = JSON.parse(
      spacetimeWorldLine(
        JSON.stringify({
          startPointId: 'A',
          endPointId: 'D',
          segments: [
            { segmentId: 'BC', startPointId: 'B', endPointId: 'C' },
            { segmentId: 'CD', startPointId: 'C', endPointId: 'D' },
            { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
          ],
        })
      )
    );
    expect(result.segments.map(segment => segment.segmentId)).toEqual([
      'AB',
      'BC',
      'CD',
    ]);
  });

  test('rejects disconnected or branching segments', () => {
    expect(
      JSON.parse(
        spacetimeWorldLine(
          JSON.stringify({
            startPointId: 'A',
            endPointId: 'D',
            segments: [
              { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
              { segmentId: 'CD', startPointId: 'C', endPointId: 'D' },
            ],
          })
        )
      )
    ).toMatchObject({
      valid: false,
      error: 'Segments do not form a complete world line.',
    });
    expect(
      JSON.parse(
        spacetimeWorldLine(
          JSON.stringify({
            startPointId: 'A',
            endPointId: 'C',
            segments: [
              { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
              { segmentId: 'BA', startPointId: 'B', endPointId: 'A' },
            ],
          })
        )
      )
    ).toMatchObject({
      valid: false,
      error: 'World line contains unused or disconnected segments.',
    });
    expect(
      JSON.parse(
        spacetimeWorldLine(
          JSON.stringify({
            startPointId: 'A',
            endPointId: 'D',
            segments: [
              { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
              { segmentId: 'AC', startPointId: 'A', endPointId: 'C' },
            ],
          })
        )
      )
    ).toMatchObject({
      valid: false,
      error: 'World line contains branching segments.',
    });
  });

  test('rejects unused segments', () => {
    expect(
      JSON.parse(
        spacetimeWorldLine(
          JSON.stringify({
            startPointId: 'A',
            endPointId: 'B',
            segments: [
              { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
              { segmentId: 'CD', startPointId: 'C', endPointId: 'D' },
            ],
          })
        )
      )
    ).toMatchObject({
      valid: false,
      error: 'World line contains unused or disconnected segments.',
    });
  });

  test('validates request shape and every required segment field', () => {
    expect(isJsonObject({})).toBe(true);
    expect(isJsonObject(null)).toBe(false);
    expect(isJsonObject('request')).toBe(false);
    expect(isJsonObject([])).toBe(false);
    expect(() => parseInput('null')).toThrow('Input must be a JSON object.');
    expect(() => parseInput('[]')).toThrow('Input must be a JSON object.');
    expect(() => parseInput('')).toThrow(
      'segments, startPointId, and endPointId are required.'
    );
    expect(() => parseInput(JSON.stringify({}))).toThrow(
      'segments, startPointId, and endPointId are required.'
    );
    expect(() =>
      parseInput(
        JSON.stringify({ segments: {}, startPointId: 'A', endPointId: 'B' })
      )
    ).toThrow('segments, startPointId, and endPointId are required.');
    expect(
      parseInput(
        JSON.stringify({ segments: [], startPointId: ' A ', endPointId: ' B ' })
      )
    ).toMatchObject({ startPointId: 'A', endPointId: 'B' });
    expect(() =>
      parseInput(JSON.stringify({ segments: [], endPointId: 'B' }))
    ).toThrow('segments, startPointId, and endPointId are required.');
    expect(() =>
      parseInput(JSON.stringify({ segments: [], startPointId: 'A' }))
    ).toThrow('segments, startPointId, and endPointId are required.');
    for (const segment of [
      { startPointId: 'A', endPointId: 'B' },
      { segmentId: 'AB', endPointId: 'B' },
      { segmentId: 'AB', startPointId: 'A' },
    ]) {
      expect(
        JSON.parse(
          spacetimeWorldLine(
            JSON.stringify({
              startPointId: 'A',
              endPointId: 'B',
              segments: [segment],
            })
          )
        )
      ).toMatchObject({
        valid: false,
        error:
          'Every segment requires segmentId, startPointId, and endPointId.',
      });
    }
  });
});
