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

  test('reports deterministic parser and payload errors', () => {
    expect(JSON.parse(spacetimeSegmentGeodesicLength('{'))).toEqual({
      valid: false,
      error: expect.any(String),
    });
    expect(JSON.parse(spacetimeSegmentGeodesicLength('[]'))).toEqual({
      valid: false,
      error: 'Input must be a JSON object.',
    });
    expect(JSON.parse(spacetimeSegmentGeodesicLength('null'))).toEqual({
      valid: false,
      error: 'Input must be a JSON object.',
    });
    expect(JSON.parse(spacetimeSegmentGeodesicLength('0'))).toEqual({
      valid: false,
      error: 'Input must be a JSON object.',
    });
    expect(JSON.parse(spacetimeSegmentGeodesicLength('"text"'))).toEqual({
      valid: false,
      error: 'Input must be a JSON object.',
    });
    expect(JSON.parse(spacetimeSegmentGeodesicLength(JSON.stringify({ points: [] })))).toEqual({
      valid: false,
      error: 'points and segment are required.',
    });
    expect(JSON.parse(spacetimeSegmentGeodesicLength(JSON.stringify({ points: {}, segment: {} })))).toEqual({
      valid: false,
      error: 'points and segment are required.',
    });
  });

  test('returns the exact unknown-point error', () => {
    expect(JSON.parse(spacetimeSegmentGeodesicLength(JSON.stringify({
      points: [{ pointId: 'A', latitude: 0, longitude: 0 }],
      segment: { startPointId: 'A', endPointId: 'B' },
    })))).toEqual({
      valid: false,
      error: 'Segment references an unknown point.',
    });
  });

  test('resolves coordinates from referenced space points', () => {
    const result = JSON.parse(
      spacetimeSegmentGeodesicLength(JSON.stringify({
        points: [
          { pointId: 'A', spacePointId: 'SP-A' },
          { pointId: 'B', latitude: 0, longitude: 1 },
        ],
        spacePoints: [{ spacePointId: 'SP-A', latitude: 0, longitude: 0 }],
        segment: { startPointId: 'A', endPointId: 'B' },
      }))
    );
    expect(result).toEqual({ value: '111319.49', unit: 'meters' });
  });

  test.each([
    [10, 20, 11, 21, '155602.99'],
    [51.5, 4.1, -33.9, 151.2, '16734289.57'],
    [80, -170, 79, 170, '418361.68'],
    [0, 0, 0, 179, '19926188.85'],
    [12.345, 67.89, -45.678, 123.456, '8498285.92'],
    [-20.25, -10.75, 35.5, 42.125, '8319617.22'],
    [63.1, -145.2, 64.7, -30.4, '4845607.27'],
    [1.25, 2.5, 48.8566, 2.3522, '5275222.69'],
    [35.6895, 139.6917, -33.8688, 151.2093, '7799478.55'],
    [89, 0, 80, 179, '1224475.42'],
    [0, 90, 45, -45, '13352683.71'],
    [27.9881, 86.925, 28.0025, 86.8528, '7273.74'],
    [0, 0, 0, 179.999, '20037397.02'],
    [0, 0, 0, 180, '20037508.34'],
    [45, 0, -45, 0, '9980545.15'],
    [45, 0, -45, 180, '20037508.34'],
    [30, -120, -30, 60, '20037508.34'],
    [70, 10, -70, -170, '20037508.21'],
    [10, -179, -10, 179, '2222996.86'],
    [5, 5, 75, 175, '11096935.22'],
    [-75, -175, 5, -5, '12204960.26'],
    [42.1, -71.2, -33.4, 151.2, '16209224.78'],
    [66.6, 25.7, -1.2, -77, '10686268.42'],
  ])('preserves WGS84 results for varied coordinates', (lat1, lon1, lat2, lon2, value) => {
    const result = JSON.parse(
      spacetimeSegmentGeodesicLength(JSON.stringify({
        points: [
          { pointId: 'A', latitude: lat1, longitude: lon1 },
          { pointId: 'B', latitude: lat2, longitude: lon2 },
        ],
        segment: { startPointId: 'A', endPointId: 'B' },
      }))
    );
    expect(result).toEqual({ value, unit: 'meters' });
  });
});
