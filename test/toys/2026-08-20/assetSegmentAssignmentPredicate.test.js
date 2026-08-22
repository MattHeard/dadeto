import { describe, expect, test } from '@jest/globals';
import { assetSegmentAssignmentPredicate } from '../../../src/core/browser/toys/2026-08-20/assetSegmentAssignmentPredicate.js';

const base = {
  points: [
    { pointId: 'P1', timestamp: '2026-01-01T00:00:00Z' },
    { pointId: 'P2', timestamp: '2026-01-01T01:00:00Z' },
    { pointId: 'P3', timestamp: '2026-01-01T02:00:00Z' },
    { pointId: 'P4', timestamp: '2026-01-01T03:00:00Z' },
  ],
  segments: [
    { segmentId: 'S1', startPointId: 'P1', endPointId: 'P2' },
    { segmentId: 'S2', startPointId: 'P2', endPointId: 'P3' },
    { segmentId: 'S3', startPointId: 'P3', endPointId: 'P4' },
    { segmentId: 'S4', startPointId: 'P1', endPointId: 'P3' },
  ],
};

const resultFor = (assignments, proposedAssignment) =>
  assetSegmentAssignmentPredicate(
    JSON.stringify({ ...base, assignments, proposedAssignment })
  );

describe('assetSegmentAssignmentPredicate', () => {
  test('rejects temporal overlap for the same asset', () => {
    expect(
      resultFor([{ assetId: 'A1', segmentId: 'S1' }], {
        assetId: 'A1',
        segmentId: 'S4',
      })
    ).toBe('false');
  });

  test('allows touching segments for the same asset', () => {
    expect(
      resultFor([{ assetId: 'A1', segmentId: 'S1' }], {
        assetId: 'A1',
        segmentId: 'S2',
      })
    ).toBe('true');
  });

  test('allows a segment assigned to another asset', () => {
    expect(
      resultFor([{ assetId: 'A1', segmentId: 'S1' }], {
        assetId: 'A2',
        segmentId: 'S1',
      })
    ).toBe('true');
  });

  test('allows a non-overlapping later segment for the same asset', () => {
    expect(
      resultFor([{ assetId: 'A1', segmentId: 'S1' }], {
        assetId: 'A1',
        segmentId: 'S3',
      })
    ).toBe('true');
  });

  test('returns false for malformed references', () => {
    expect(resultFor([], { assetId: 'A1', segmentId: 'missing' })).toBe(
      'false'
    );
  });

  test('returns false for malformed requests and invalid proposed assignments', () => {
    expect(assetSegmentAssignmentPredicate('{')).toBe('false');
    expect(
      assetSegmentAssignmentPredicate(
        JSON.stringify({ ...base, assignments: [], proposedAssignment: {} })
      )
    ).toBe('false');
  });
});
