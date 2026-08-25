import { describe, expect, test } from '@jest/globals';
import { spacetimeWorldLinePairPredicate } from '../../../src/core/browser/toys/2026-08-20/spacetimeWorldLinePairPredicate.js';

const points = [
  { pointId: 'P1', timestamp: '2026-01-01T00:00:00Z' },
  { pointId: 'P2', timestamp: '2026-01-01T01:00:00Z' },
  { pointId: 'P3', timestamp: '2026-01-01T02:00:00Z' },
  { pointId: 'P4', timestamp: '2026-01-01T03:00:00Z' },
  { pointId: 'P5', timestamp: '2026-01-01T01:00:00Z' },
];
const segments = [
  { segmentId: 'S1', startPointId: 'P1', endPointId: 'P2' },
  { segmentId: 'S2', startPointId: 'P2', endPointId: 'P3' },
  { segmentId: 'S3', startPointId: 'P3', endPointId: 'P4' },
  { segmentId: 'S4', startPointId: 'P1', endPointId: 'P3' },
];
const call = (extra = {}) =>
  spacetimeWorldLinePairPredicate(
    JSON.stringify({ points, segments, firstSegmentId: 'S1', secondSegmentId: 'S2', ...extra })
  );

describe('spacetimeWorldLinePairPredicate', () => {
  test('accepts connected touching segments and rejects disconnected touching segments', () => {
    expect(call()).toBe('true');
    expect(call({ firstSegmentId: 'S2', secondSegmentId: 'S1' })).toBe('true');
    expect(call({ segments: segments.map(s => ({ ...s })), secondSegmentId: 'S3' })).toBe('true');
    expect(
      call({
        segments: [
          ...segments,
          { segmentId: 'S5', startPointId: 'P5', endPointId: 'P3' },
          { segmentId: 'S6', startPointId: 'P1', endPointId: 'P5' },
        ],
        secondSegmentId: 'S5',
      })
    ).toBe('false');
    expect(
      call({
        firstSegmentId: 'S2',
        secondSegmentId: 'S6',
        segments: [...segments, { segmentId: 'S6', startPointId: 'P1', endPointId: 'P5' }],
      })
    ).toBe('false');
  });

  test('rejects overlap and accepts separated intervals', () => {
    expect(call({ secondSegmentId: 'S4' })).toBe('false');
    expect(
      call({
        points,
        segments,
        firstSegmentId: 'S1',
        secondSegmentId: 'S3',
      })
    ).toBe('true');
  });

  test('returns structured errors for malformed and unknown references', () => {
    expect(spacetimeWorldLinePairPredicate('{}')).toContain('Points and segments are required.');
    expect(
      spacetimeWorldLinePairPredicate(JSON.stringify({ points, segments: undefined }))
    ).toContain('Points and segments are required.');
    expect(
      spacetimeWorldLinePairPredicate(JSON.stringify({ points: undefined, segments }))
    ).toContain('Points and segments are required.');
    expect(call({ firstSegmentId: 'missing' })).toContain('Unknown segment: missing');
    expect(
      call({
        segments: [{ segmentId: 'S', startPointId: 'P1', endPointId: 'missing' }],
        firstSegmentId: 'S',
      })
    ).toContain('Segment references an unknown point.');
    expect(
      call({
        segments: [{ segmentId: 'S', startPointId: 'missing', endPointId: 'P2' }],
        firstSegmentId: 'S',
      })
    ).toContain('Segment references an unknown point.');
    expect(
      call({
        points: [points[1], points[0], points[2], points[3]],
        segments: [{ segmentId: 'S', startPointId: 'P2', endPointId: 'P1' }],
        firstSegmentId: 'S',
      })
    ).toContain('ordered valid UTC interval');
    expect(
      call({
        points: [{ pointId: 'P', timestamp: '2026-01-01T00:00:00Z' }],
        segments: [{ segmentId: 'S', startPointId: 'P', endPointId: 'P' }],
        firstSegmentId: 'S',
        secondSegmentId: 'S',
      })
    ).toBe('true');
    expect(
      call({
        points: [
          { pointId: 'P1', timestamp: 'invalid' },
          { pointId: 'P2', timestamp: '2026-01-01T00:00:00Z' },
        ],
        segments: [{ segmentId: 'S', startPointId: 'P1', endPointId: 'P2' }],
        firstSegmentId: 'S',
        secondSegmentId: 'S',
      })
    ).toContain('ordered valid UTC interval');
  });
});
