import { describe, expect, test } from '@jest/globals';
import {
  parseInput,
  isJsonObject,
  spacetimeSegmentDuration,
} from '../../../src/core/browser/toys/2026-08-19/spacetimeSegmentDuration.js';

describe('spacetimeSegmentDuration', () => {
  test('returns UTC duration in seconds as a string', () => {
    const result = JSON.parse(
      spacetimeSegmentDuration(
        JSON.stringify({
          points: [
            { pointId: 'A', timestamp: '2026-08-19T09:00Z' },
            { pointId: 'B', timestamp: '2026-08-19T10:30Z' },
          ],
          segment: { startPointId: 'A', endPointId: 'B' },
        })
      )
    );
    expect(result).toEqual({ value: '5400', unit: 'seconds' });
  });

  test('returns zero for an instantaneous segment', () => {
    const result = JSON.parse(
      spacetimeSegmentDuration(
        JSON.stringify({
          points: [
            { pointId: 'A', timestamp: '2026-08-19T09:00Z' },
            { pointId: 'B', timestamp: '2026-08-19T09:00Z' },
          ],
          segment: { startPointId: 'A', endPointId: 'B' },
        })
      )
    );
    expect(result).toEqual({ value: '0', unit: 'seconds' });
  });

  test('returns a structured error for reversed or missing references', () => {
    expect(
      JSON.parse(
        spacetimeSegmentDuration(
          JSON.stringify({
            points: [{ pointId: 'A', timestamp: '2026-08-19T10:00Z' }],
            segment: { startPointId: 'A', endPointId: 'missing' },
          })
        )
      )
    ).toEqual({ valid: false, error: 'Segment references an unknown point.' });
    expect(
      JSON.parse(
        spacetimeSegmentDuration(
          JSON.stringify({
            points: [
              { pointId: 'A', timestamp: '2026-08-19T10:00Z' },
              { pointId: 'B', timestamp: '2026-08-19T09:00Z' },
            ],
            segment: { startPointId: 'A', endPointId: 'B' },
          })
        )
      )
    ).toEqual({
      valid: false,
      error: 'Segment must have an ordered valid UTC interval.',
    });
    expect(
      JSON.parse(
        spacetimeSegmentDuration(
          JSON.stringify({
            points: [
              { pointId: 'A', timestamp: 'not-a-date' },
              { pointId: 'B', timestamp: '2026-08-19T09:00Z' },
            ],
            segment: { startPointId: 'A', endPointId: 'B' },
          })
        )
      )
    ).toEqual({
      valid: false,
      error: 'Segment must have an ordered valid UTC interval.',
    });
  });

  test('validates parsed object, points, and segment shape', () => {
    expect(isJsonObject({})).toBe(true);
    expect(isJsonObject(null)).toBe(false);
    expect(isJsonObject([])).toBe(false);
    expect(isJsonObject('object')).toBe(false);
    expect(() => parseInput('')).toThrow('points and segment are required.');
    expect(() => parseInput('null')).toThrow('Input must be a JSON object.');
    expect(() => parseInput('[]')).toThrow('Input must be a JSON object.');
    expect(() => parseInput(JSON.stringify({}))).toThrow(
      'points and segment are required.'
    );
    expect(() =>
      parseInput(JSON.stringify({ points: [], segment: null }))
    ).toThrow('points and segment are required.');
    expect(() =>
      parseInput(JSON.stringify({ points: {}, segment: {} }))
    ).toThrow('points and segment are required.');
    expect(
      parseInput(
        JSON.stringify({
          points: [{ pointId: 'A', timestamp: '2026-08-19T09:00Z' }],
          segment: { startPointId: 'A', endPointId: 'A' },
        })
      )
    ).toEqual({
      points: [{ pointId: 'A', timestamp: '2026-08-19T09:00Z' }],
      segment: { startPointId: 'A', endPointId: 'A' },
    });
    expect(() =>
      parseInput(
        JSON.stringify({
          points: [
            {
              pointId: 'A',
              spacePointId: 'undefined',
              timestamp: '2026-08-19T09:00Z',
            },
          ],
          spacePoints: null,
          segment: { startPointId: 'A', endPointId: 'A' },
        })
      )
    ).toThrow('Unknown space point: undefined');
  });
});
