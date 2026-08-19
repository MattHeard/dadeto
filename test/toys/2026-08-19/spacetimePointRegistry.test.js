import { describe, expect, test } from '@jest/globals';
import { spacetimePointRegistry } from '../../../src/core/browser/toys/2026-08-19/spacetimePointRegistry.js';

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
        latitude: 51.507352,
        longitude: -0.127758,
        timestamp: '2026-08-21T09:05Z',
      },
      {
        pointId: 'P002',
        latitude: 90,
        longitude: -180,
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
        latitude: 0,
        longitude: 0,
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
});
