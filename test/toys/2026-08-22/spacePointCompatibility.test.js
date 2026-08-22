import { describe, expect, test } from '@jest/globals';
import { spacePointRegistry } from '../../../src/core/browser/toys/2026-08-22/spacePointRegistry.js';
import { spacetimePointRegistry } from '../../../src/core/browser/toys/2026-08-19/spacetimePointRegistry.js';
import { spacetimeSegmentGeodesicLength } from '../../../src/core/browser/toys/2026-08-19/spacetimeSegmentGeodesicLength.js';
import { constantSpeedGeodesicTravelDuration } from '../../../src/core/browser/toys/2026-08-20/constantSpeedGeodesicTravelDuration.js';
import { wgs84CirclePointPredicate } from '../../../src/core/browser/toys/2026-08-20/wgs84CirclePointPredicate.js';

const spacePoints = [
  { spacePointId: 'LOC1', latitude: 51.5, longitude: -0.12 },
];
const point = {
  pointId: 'TIME1',
  spacePointId: 'LOC1',
  timestamp: '2026-08-22T12:00Z',
};

describe('atemporal space-point compatibility', () => {
  test('SPAC8 normalizes atemporal WGS84 points', () => {
    const result = JSON.parse(
      spacePointRegistry(JSON.stringify({ spacePoints }))
    );
    expect(result.spacePoints).toEqual(spacePoints);
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
      latitude: 1,
      longitude: 2,
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
