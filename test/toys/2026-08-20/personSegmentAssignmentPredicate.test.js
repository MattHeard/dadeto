import { describe, expect, test } from '@jest/globals';
import { personSegmentAssignmentPredicate } from '../../../src/core/browser/toys/2026-08-20/personSegmentAssignmentPredicate.js';

const input = assignments =>
  JSON.stringify({
    points: [
      { pointId: 'P1', timestamp: '2026-01-01T00:00:00Z' },
      { pointId: 'P2', timestamp: '2026-01-01T01:00:00Z' },
      { pointId: 'P3', timestamp: '2026-01-01T02:00:00Z' },
    ],
    segments: [
      { segmentId: 'S1', startPointId: 'P1', endPointId: 'P2' },
      { segmentId: 'S2', startPointId: 'P2', endPointId: 'P3' },
      { segmentId: 'S3', startPointId: 'P1', endPointId: 'P3' },
    ],
    assignments,
    proposedAssignment: { personId: 'P1', segmentId: 'S3' },
  });

describe('personSegmentAssignmentPredicate', () => {
  test('rejects overlap for the same person', () =>
    expect(
      personSegmentAssignmentPredicate(
        input([{ personId: 'P1', segmentId: 'S1' }])
      )
    ).toBe('false'));
  test('allows touching segments', () =>
    expect(
      personSegmentAssignmentPredicate(
        JSON.stringify({
          ...JSON.parse(input([])),
          assignments: [{ personId: 'P1', segmentId: 'S1' }],
          proposedAssignment: { personId: 'P1', segmentId: 'S2' },
        })
      )
    ).toBe('true'));
  test('ignores assignments for other people', () =>
    expect(
      personSegmentAssignmentPredicate(
        input([{ personId: 'P2', segmentId: 'S1' }])
      )
    ).toBe('true'));
});
