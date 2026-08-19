import { describe, expect, test } from '@jest/globals';
import { spacetimeSegmentGeodesicLength } from '../../../src/core/browser/toys/2026-08-19/spacetimeSegmentGeodesicLength.js';

describe('spacetimeSegmentGeodesicLength', () => {
  test('returns WGS84 surface length with string value and unit', () => {
    const result = JSON.parse(
      spacetimeSegmentGeodesicLength(
        JSON.stringify({
          points: [
            { pointId: 'A', latitude: 0, longitude: 0 },
            { pointId: 'B', latitude: 0, longitude: 1 },
          ],
          segment: { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
        })
      )
    );
    expect(result.unit).toBe('meters');
    expect(typeof result.value).toBe('string');
    expect(Number(result.value)).toBeCloseTo(111319.49, 1);
  });

  test('returns zero for identical points and ignores time/altitude', () => {
    const result = JSON.parse(
      spacetimeSegmentGeodesicLength(
        JSON.stringify({
          points: [
            {
              pointId: 'A',
              latitude: 51,
              longitude: 4,
              timestamp: 'x',
              altitude: 2,
            },
            {
              pointId: 'B',
              latitude: 51,
              longitude: 4,
              timestamp: 'y',
              altitude: 200,
            },
          ],
          segment: { startPointId: 'A', endPointId: 'B' },
        })
      )
    );
    expect(result).toEqual({ value: '0.00', unit: 'meters' });
  });

  test('returns a structured error for missing point references', () => {
    expect(
      JSON.parse(
        spacetimeSegmentGeodesicLength(
          JSON.stringify({
            points: [],
            segment: { startPointId: 'A', endPointId: 'B' },
          })
        )
      )
    ).toMatchObject({ valid: false });
  });
});
