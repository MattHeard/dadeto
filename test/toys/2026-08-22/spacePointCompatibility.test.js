import { describe, expect, test } from '@jest/globals';
import { spacePointRegistry } from '../../../src/core/browser/toys/2026-08-22/spacePointRegistry.js';
import { spacetimePointRegistry } from '../../../src/core/browser/toys/2026-08-19/spacetimePointRegistry.js';
import { spacetimeSegmentGeodesicLength } from '../../../src/core/browser/toys/2026-08-19/spacetimeSegmentGeodesicLength.js';
import { constantSpeedGeodesicTravelDuration } from '../../../src/core/browser/toys/2026-08-20/constantSpeedGeodesicTravelDuration.js';
import { wgs84CirclePointPredicate } from '../../../src/core/browser/toys/2026-08-20/wgs84CirclePointPredicate.js';
import {
  resolvePoint,
  resolvePointRecords,
} from '../../../src/core/browser/toys/2026-08-22/spacePointResolution.js';

const spacePoints = [
  { spacePointId: 'LOC1', latitude: '51.500000', longitude: '-0.120000' },
];
const point = {
  pointId: 'TIME1',
  spacePointId: 'LOC1',
  timestamp: '2026-08-22T12:00Z',
};

describe('atemporal space-point compatibility', () => {
  test('rejects malformed registry points and resolves all reference boundaries', () => {
    expect(
      JSON.parse(
        spacePointRegistry(
          JSON.stringify({
            spacePoints: [
              null,
              {},
              { spacePointId: 'X', latitude: 91, longitude: 0 },
            ],
          })
        )
      ).spacePoints
    ).toEqual([]);
    const map = new Map(spacePoints.map(value => [value.spacePointId, value]));
    expect(
      resolvePoint({ pointId: 'P', spacePointId: 'LOC1' }, map)
    ).toMatchObject(spacePoints[0]);
    expect(
      resolvePointRecords(
        [{ pointId: 'P', spacePointId: 'LOC1' }],
        spacePoints,
        true
      )[0]
    ).toMatchObject(spacePoints[0]);
    expect(() =>
      resolvePoint({ pointId: 'P', spacePointId: 'MISSING' }, map)
    ).toThrow('Unknown space point');
    expect(() => resolvePoint({ pointId: 'P' }, map, true)).toThrow(
      'has no coordinates'
    );
    expect(() =>
      resolvePoint({ pointId: 'P', spacePointId: 'LOC1', latitude: 1 }, map)
    ).toThrow('incomplete coordinates');
    expect(() =>
      resolvePoint(
        { pointId: 'P', spacePointId: 'LOC1', latitude: 1, longitude: 2 },
        map
      )
    ).toThrow('conflicts');
  });

  test('SPAC8 normalizes atemporal WGS84 points', () => {
    const result = JSON.parse(
      spacePointRegistry(JSON.stringify({ spacePoints }))
    );
    expect(result.spacePoints).toEqual([
      { spacePointId: 'LOC1', latitude: '51.500000', longitude: '-0.120000' },
    ]);
  });

  test('sorts multiple atemporal points and covers legacy resolver defaults', () => {
    const result = JSON.parse(
      spacePointRegistry(
        JSON.stringify({
          spacePoints: [
            { spacePointId: 'B', latitude: 2, longitude: 3 },
            { spacePointId: 'A', latitude: 1, longitude: 2 },
          ],
        })
      )
    );
    expect(result.spacePoints.map(value => value.spacePointId)).toEqual([
      'A',
      'B',
    ]);
    expect(
      resolvePointRecords([{ pointId: 'INLINE', latitude: 1, longitude: 2 }])[0]
    ).toEqual({
      pointId: 'INLINE',
      latitude: '1.000000',
      longitude: '2.000000',
    });
    expect(
      resolvePoint({ pointId: 'INLINE', latitude: 1, longitude: 2 }, new Map())
    ).toEqual({
      pointId: 'INLINE',
      latitude: '1.000000',
      longitude: '2.000000',
    });
    expect(() =>
      resolvePoint({ pointId: 'PARTIAL', latitude: 1 }, new Map(), true)
    ).toThrow('has no coordinates');
    expect(
      resolvePoint(
        {
          pointId: 'P',
          spacePointId: 'LOC1',
          latitude: 51.5,
          longitude: -0.12,
        },
        new Map(spacePoints.map(value => [value.spacePointId, value]))
      )
    ).toMatchObject(spacePoints[0]);
  });

  test('SPAC1 accepts referenced points and preserves legacy inline points', () => {
    const result = JSON.parse(
      spacetimePointRegistry(
        JSON.stringify({
          points: [
            point,
            {
              pointId: 'LEGACY',
              latitude: 1,
              longitude: 2,
              timestamp: '2026-08-22T12:00Z',
            },
          ],
        })
      )
    );
    expect(result.points).toContainEqual(point);
    expect(result.points).toContainEqual({
      pointId: 'LEGACY',
      latitude: '1.000000',
      longitude: '2.000000',
      timestamp: '2026-08-22T12:00Z',
    });
  });

  test('coordinate consumers resolve the reference through spacePoints', () => {
    const input = {
      points: [
        point,
        { ...point, pointId: 'TIME2', timestamp: '2026-08-22T13:00Z' },
      ],
      spacePoints,
      segment: { startPointId: 'TIME1', endPointId: 'TIME2' },
      speedKilometersPerHour: 10,
    };
    expect(
      JSON.parse(
        spacetimeSegmentGeodesicLength(
          JSON.stringify({
            points: input.points,
            spacePoints,
            segment: input.segment,
          })
        )
      ).unit
    ).toBe('meters');
    expect(
      JSON.parse(constantSpeedGeodesicTravelDuration(JSON.stringify(input)))
        .unit
    ).toBe('seconds');
  });

  test('referenced points work in service-area predicates', () => {
    expect(
      wgs84CirclePointPredicate(
        JSON.stringify({
          point,
          spacePoints,
          circle: {
            center: { latitude: 51.5, longitude: -0.12 },
            radiusMeters: 1,
          },
        })
      )
    ).toBe('true');
  });
});
