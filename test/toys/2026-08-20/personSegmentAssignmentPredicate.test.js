import { describe, expect, test } from '@jest/globals';
import {
  personSegmentAssignmentPredicate,
  normalizeAssignment,
  overlaps,
  parseRequest,
  resolveInterval,
} from '../../../src/core/browser/toys/2026-08-20/personSegmentAssignmentPredicate.js';

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

  test('returns false for malformed requests and missing references', () => {
    expect(personSegmentAssignmentPredicate('{')).toBe('false');
    expect(
      personSegmentAssignmentPredicate(
        input([{ personId: 'P1', segmentId: 'missing' }])
      )
    ).toBe('false');
    expect(
      personSegmentAssignmentPredicate(
        JSON.stringify({ ...JSON.parse(input([])), proposedAssignment: {} })
      )
    ).toBe('false');
  });

  test('ignores malformed assignments and rejects invalid intervals', () => {
    expect(
      personSegmentAssignmentPredicate(
        input([null, [], {}, { personId: 'P1', segmentId: 'S1' }])
      )
    ).toBe('false');
    const base = JSON.parse(input([]));
    const invalid = {
      ...base,
      points: base.points.map(point =>
        point.pointId === 'P2' ? { ...point, timestamp: 'bad' } : point
      ),
      proposedAssignment: { personId: 'P1', segmentId: 'S2' },
    };
    expect(personSegmentAssignmentPredicate(JSON.stringify(invalid))).toBe(
      'false'
    );
    const reversed = {
      ...base,
      segments: [{ segmentId: 'BAD', startPointId: 'P2', endPointId: 'P1' }],
      proposedAssignment: { personId: 'P1', segmentId: 'BAD' },
    };
    expect(personSegmentAssignmentPredicate(JSON.stringify(reversed))).toBe(
      'false'
    );
  });

  test('covers parser, normalization, interval, and overlap boundaries directly', () => {
    expect(() => parseRequest(null)).toThrow();
    expect(() => parseRequest('[]')).toThrow();
    const valid = JSON.parse(input([{ personId: 'P1', segmentId: 'S1' }]));
    expect(
      parseRequest(
        JSON.stringify({
          ...valid,
          assignments: [null, [], ...valid.assignments],
        })
      ).assignments
    ).toEqual([{ personId: 'P1', segmentId: 'S1' }]);
    for (const field of ['points', 'segments', 'assignments']) {
      const missing = { ...valid };
      delete missing[field];
      expect(() => parseRequest(JSON.stringify(missing))).toThrow(
        `${field} array is required.`
      );
    }
    expect(normalizeAssignment(null)).toBeNull();
    expect(normalizeAssignment([])).toBeNull();
    const arrayAssignment = [];
    arrayAssignment.personId = 'P1';
    arrayAssignment.segmentId = 'S1';
    expect(normalizeAssignment(arrayAssignment)).toBeNull();
    expect(normalizeAssignment({ personId: null, segmentId: 'S1' })).toBeNull();
    expect(normalizeAssignment({ personId: 'P1', segmentId: null })).toBeNull();
    expect(
      normalizeAssignment({ personId: ' P1 ', segmentId: ' S1 ' })
    ).toEqual({ personId: 'P1', segmentId: 'S1' });
    expect(() =>
      parseRequest(JSON.stringify({ ...valid, proposedAssignment: null }))
    ).toThrow('A proposed assignment is required.');
    const base = JSON.parse(input([]));
    const pointMap = new Map(base.points.map(point => [point.pointId, point]));
    const segmentMap = new Map(
      base.segments.map(segment => [segment.segmentId, segment])
    );
    expect(resolveInterval(segmentMap, pointMap, 'S1').startTime).toBe(
      Date.parse(base.points[0].timestamp)
    );
    expect(() => resolveInterval(segmentMap, pointMap, 'missing')).toThrow(
      'Unknown segment: missing'
    );
    expect(() =>
      resolveInterval(
        new Map([['S', { startPointId: 'P1', endPointId: 'missing' }]]),
        pointMap,
        'S'
      )
    ).toThrow('unknown point');
    expect(() =>
      resolveInterval(
        new Map([['S', { startPointId: 'P2', endPointId: 'P1' }]]),
        pointMap,
        'S'
      )
    ).toThrow('Segment S must have an ordered valid time interval.');
    expect(
      resolveInterval(
        new Map([['S', { startPointId: 'P1', endPointId: 'P1' }]]),
        new Map([['P1', base.points[0]]]),
        'S'
      )
    ).toEqual({
      startTime: Date.parse(base.points[0].timestamp),
      endTime: Date.parse(base.points[0].timestamp),
    });
    expect(
      overlaps({ startTime: 0, endTime: 1 }, { startTime: 1, endTime: 2 })
    ).toBe(false);
    expect(
      overlaps({ startTime: 0, endTime: 2 }, { startTime: 1, endTime: 3 })
    ).toBe(true);
  });
});
