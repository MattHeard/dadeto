import { expect, test } from '@jest/globals';
import { spacetimeSegmentDuration } from '../../../src/core/browser/toys/2026-08-19/spacetimeSegmentDuration.js';
import { spacetimeSegmentGeodesicLength } from '../../../src/core/browser/toys/2026-08-19/spacetimeSegmentGeodesicLength.js';

test('measurements retain distinct empty-input policies', () => {
  expect(JSON.parse(spacetimeSegmentDuration('')).error).toBe(
    'points and segment are required.'
  );
  expect(JSON.parse(spacetimeSegmentGeodesicLength('')).error).toMatch(/JSON/);
});

test('shared endpoint resolution preserves distinct measurement precision and units', () => {
  const input = JSON.stringify({
    points: [
      { pointId: 'A', timestamp: '2026-01-01T00:00:00Z', spacePointId: 'home' },
      { pointId: 'B', timestamp: '2026-01-01T00:01:00Z', spacePointId: 'home' },
    ],
    spacePoints: [{ spacePointId: 'home', latitude: 0, longitude: 0 }],
    segment: { startPointId: 'A', endPointId: 'B' },
  });
  expect(JSON.parse(spacetimeSegmentDuration(input))).toEqual({
    value: '60',
    unit: 'seconds',
  });
  expect(JSON.parse(spacetimeSegmentGeodesicLength(input))).toEqual({
    value: '0.00',
    unit: 'meters',
  });
});
