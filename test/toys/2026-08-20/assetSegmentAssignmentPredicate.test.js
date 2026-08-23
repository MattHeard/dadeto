import { describe, expect, test } from '@jest/globals';
import {
  assetSegmentAssignmentPredicate,
  normalizeAssignment,
  parseRequest,
  resolveInterval,
} from '../../../src/core/browser/toys/2026-08-20/assetSegmentAssignmentPredicate.js';

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

  test('validates parser input shapes and assignment identifiers', () => {
    expect(() => parseRequest(null)).toThrow('Input must be a JSON object.');
    expect(() => parseRequest('[]')).toThrow('Input must be a JSON object.');
    expect(() => parseRequest(JSON.stringify({}))).toThrow(
      'points, segments, and assignments arrays are required.'
    );
    for (const field of ['points', 'segments', 'assignments']) {
      const request = {
        points: [],
        segments: [],
        assignments: [],
        proposedAssignment: { assetId: 'A1', segmentId: 'S1' },
      };
      delete request[field];
      expect(() => parseRequest(JSON.stringify(request))).toThrow(
        'points, segments, and assignments arrays are required.'
      );
    }
    expect(
      parseRequest(
        JSON.stringify({
          points: [],
          segments: [],
          assignments: [],
          proposedAssignment: { assetId: 'A1', segmentId: 'S1' },
        })
      ).proposedAssignment
    ).toEqual({ assetId: 'A1', segmentId: 'S1' });
    expect(() =>
      parseRequest(
        JSON.stringify({
          points: [],
          segments: [],
          assignments: [],
          proposedAssignment: null,
        })
      )
    ).toThrow('A proposed assignment is required.');
    expect(normalizeAssignment(null)).toBeNull();
    expect(normalizeAssignment([])).toBeNull();
    const arrayWithAssignmentFields = [];
    arrayWithAssignmentFields.assetId = 'A1';
    arrayWithAssignmentFields.segmentId = 'S1';
    expect(normalizeAssignment(arrayWithAssignmentFields)).toBeNull();
    expect(normalizeAssignment({ assetId: ' ', segmentId: 'S1' })).toBeNull();
    expect(normalizeAssignment({ assetId: 'A1', segmentId: ' ' })).toBeNull();
    expect(normalizeAssignment({ assetId: null, segmentId: 'S1' })).toBeNull();
    expect(normalizeAssignment({ assetId: 'A1', segmentId: null })).toBeNull();
    expect(normalizeAssignment({ assetId: ' A1 ', segmentId: ' S1 ' })).toEqual(
      {
        assetId: 'A1',
        segmentId: 'S1',
      }
    );
  });

  test('ignores malformed existing assignments while preserving valid candidates', () => {
    expect(
      resultFor([null, [], {}, { assetId: 'A1', segmentId: 'S1' }], {
        assetId: 'A1',
        segmentId: 'S2',
      })
    ).toBe('true');
  });

  test('rejects invalid and reversed segment intervals', () => {
    const invalid = {
      ...base,
      segments: [{ segmentId: 'BAD', startPointId: 'P1', endPointId: 'P2' }],
      points: base.points.map(point =>
        point.pointId === 'P2' ? { ...point, timestamp: 'invalid' } : point
      ),
      assignments: [],
      proposedAssignment: { assetId: 'A1', segmentId: 'BAD' },
    };
    expect(assetSegmentAssignmentPredicate(JSON.stringify(invalid))).toBe(
      'false'
    );
    const reversed = {
      ...base,
      segments: [{ segmentId: 'BAD', startPointId: 'P2', endPointId: 'P1' }],
      assignments: [],
      proposedAssignment: { assetId: 'A1', segmentId: 'BAD' },
    };
    expect(assetSegmentAssignmentPredicate(JSON.stringify(reversed))).toBe(
      'false'
    );
<<<<<<< Updated upstream
    const equal = {
      ...base,
      segments: [{ segmentId: 'BAD', startPointId: 'P1', endPointId: 'P1' }],
      assignments: [],
      proposedAssignment: { assetId: 'A1', segmentId: 'BAD' },
    };
    expect(assetSegmentAssignmentPredicate(JSON.stringify(equal))).toBe('true');
    expect(() => resolveInterval(new Map(), new Map(), 'missing')).toThrow(
      'Unknown segment: missing'
    );
    expect(() =>
      resolveInterval(
        new Map([['S1', { startPointId: 'P1', endPointId: 'missing' }]]),
        new Map([['P1', base.points[0]]]),
        'S1'
      )
    ).toThrow('references an unknown point');
    expect(() =>
      resolveInterval(
        new Map([['S1', { startPointId: 'P2', endPointId: 'P1' }]]),
        new Map([
          ['P1', base.points[0]],
          ['P2', base.points[1]],
        ]),
        'S1'
      )
    ).toThrow('must have an ordered valid time interval');
=======
>>>>>>> Stashed changes
  });
});
