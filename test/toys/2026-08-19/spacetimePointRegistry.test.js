import { describe, expect, test } from '@jest/globals';
import {
  normalizeCoordinate,
  normalizePoint,
  normalizeUtcMinute,
  spacetimePointRegistry,
} from '../../../src/core/browser/toys/2026-08-19/spacetimePointRegistry.js';

describe('spacetimePointRegistry', () => {
  test('normalizes WGS84 coordinates and UTC-minute timestamps', () => {
    const result = JSON.parse(
      spacetimePointRegistry(
        JSON.stringify({
          points: [
            {
              pointId: 'P002',
              latitude: 90,
              longitude: -180,
              timestamp: '2026-08-21T18:00Z',
            },
            {
              pointId: 'P001',
              latitude: 51.5073519,
              longitude: -0.1277584,
              timestamp: '2026-08-21T09:05Z',
            },
          ],
        })
      )
    );
    expect(result.points).toEqual([
      {
        pointId: 'P001',
        latitude: '51.507352',
        longitude: '-0.127758',
        timestamp: '2026-08-21T09:05Z',
      },
      {
        pointId: 'P002',
        latitude: '90.000000',
        longitude: '-180.000000',
        timestamp: '2026-08-21T18:00Z',
      },
    ]);
    expect(result.summary).toEqual({ pointCount: 2 });
  });

  test('ignores malformed points and does not add altitude', () => {
    const result = JSON.parse(
      spacetimePointRegistry(
        JSON.stringify({
          points: [
            {
              pointId: 'valid',
              latitude: 0,
              longitude: 0,
              timestamp: '2026-08-21T09:05Z',
              altitude: 12,
            },
            { pointId: 'bad', latitude: 91, longitude: 0, timestamp: 'bad' },
          ],
        })
      )
    );
    expect(result.points).toEqual([
      {
        pointId: 'valid',
        latitude: '0.000000',
        longitude: '0.000000',
        timestamp: '2026-08-21T09:05Z',
      },
    ]);
  });

  test('returns an empty registry for invalid input', () => {
    expect(JSON.parse(spacetimePointRegistry('{'))).toEqual({
      points: [],
      summary: { pointCount: 0 },
    });
  });

  test('normalizes and rejects point shapes directly', () => {
    const point = {
      pointId: ' P001 ',
      latitude: 51.5073519,
      longitude: -0.1277584,
      timestamp: '2026-08-21T09:05Z',
    };
    expect(normalizePoint(point)).toEqual({
      pointId: 'P001',
      latitude: '51.507352',
      longitude: '-0.127758',
      timestamp: '2026-08-21T09:05Z',
    });
    expect(normalizePoint(null)).toBeNull();
    expect(normalizePoint([])).toBeNull();
    expect(normalizePoint('point')).toBeNull();
    expect(normalizePoint({
      latitude: 0,
      longitude: 0,
      timestamp: '2026-08-21T09:05Z',
    })).toBeNull();
    expect(normalizePoint({
      spacePointId: 'SP',
      timestamp: '2026-08-21T09:05Z',
    })).toBeNull();
    expect(
      normalizePoint({
        pointId: 'P',
        latitude: 0,
        longitude: 0,
        timestamp: '2026-08-21T09:05Z',
      })
    ).toEqual({
      pointId: 'P',
      latitude: '0.000000',
      longitude: '0.000000',
      timestamp: '2026-08-21T09:05Z',
    });
    const functionWithPointFields = Object.assign(() => {}, {
      pointId: 'P',
      latitude: 0,
      longitude: 0,
      timestamp: '2026-08-21T09:05Z',
    });
    expect(normalizePoint(functionWithPointFields)).toBeNull();
    expect(normalizePoint({ ...point, pointId: '' })).toBeNull();
    expect(normalizePoint({ ...point, latitude: null })).toBeNull();
    expect(normalizePoint({ ...point, longitude: null })).toBeNull();
    expect(normalizePoint({
      ...point,
      latitude: null,
      longitude: null,
    })).toBeNull();
    expect(normalizePoint({
      pointId: 'P',
      spacePointId: 'SP',
      latitude: 0,
      timestamp: '2026-08-21T09:05Z',
    })).toBeNull();
    expect(normalizePoint({
      pointId: 'P',
      spacePointId: '',
      latitude: 0,
      longitude: null,
      timestamp: '2026-08-21T09:05Z',
    })).toBeNull();
    expect(normalizePoint({ ...point, timestamp: null })).toBeNull();
    expect(
      normalizePoint({
        pointId: 'P-REF',
        spacePointId: 'SP-1',
        timestamp: '2026-08-21T09:05Z',
      })
    ).toEqual({
      pointId: 'P-REF',
      spacePointId: 'SP-1',
      timestamp: '2026-08-21T09:05Z',
    });
  });

  test('enforces inclusive coordinate bounds and finite numeric values', () => {
    expect(normalizeCoordinate(-90, -90, 90)).toBe('-90.000000');
    expect(normalizeCoordinate(90, -90, 90)).toBe('90.000000');
    expect(normalizeCoordinate(-180, -180, 180)).toBe('-180.000000');
    expect(normalizeCoordinate(180, -180, 180)).toBe('180.000000');
    expect(normalizeCoordinate(1.2345678, -90, 90)).toBe('1.234568');
    expect(normalizeCoordinate('1', -90, 90)).toBe('1.000000');
    expect(normalizeCoordinate(Infinity, -90, 90)).toBeNull();
    expect(normalizeCoordinate(NaN, -90, 90)).toBeNull();
    expect(normalizeCoordinate(-91, -90, 90)).toBeNull();
    expect(normalizeCoordinate(181, -180, 180)).toBeNull();
  });

  test('accepts only valid UTC minute timestamps', () => {
    expect(normalizeUtcMinute(' 2026-08-21T09:05Z ')).toBe('2026-08-21T09:05Z');
    expect(normalizeUtcMinute('2026-13-30T09:05Z')).toBeNull();
    expect(normalizeUtcMinute('2026-08-21T09:05:00Z')).toBeNull();
    expect(normalizeUtcMinute('prefix2026-08-21T09:05Z')).toBeNull();
    expect(normalizeUtcMinute('2026-08-21T09:05Zsuffix')).toBeNull();
    expect(normalizeUtcMinute('not-a-date')).toBeNull();
    expect(normalizeUtcMinute(null)).toBeNull();
  });
});
