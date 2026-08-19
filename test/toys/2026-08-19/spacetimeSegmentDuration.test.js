import { describe, expect, test } from '@jest/globals';
import { spacetimeSegmentDuration } from '../../../src/core/browser/toys/2026-08-19/spacetimeSegmentDuration.js';

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
    ).toMatchObject({ valid: false });
  });
});
