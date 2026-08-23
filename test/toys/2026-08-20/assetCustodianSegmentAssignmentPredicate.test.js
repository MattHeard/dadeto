import { describe, expect, test } from '@jest/globals';
import {
  assetCustodianSegmentAssignmentPredicate,
  normalizeAsset,
  normalizePerson,
  normalizeProposed,
  overlaps,
  parseRequest,
  resolveInterval,
} from '../../../src/core/browser/toys/2026-08-20/assetCustodianSegmentAssignmentPredicate.js';

const payload = (assetAssignments, personAssignments, proposedAssignment) =>
  JSON.stringify({
    points: [
      { pointId: 'P1', timestamp: '2026-01-01T00:00:00Z' },
      { pointId: 'P2', timestamp: '2026-01-01T01:00:00Z' },
      { pointId: 'P3', timestamp: '2026-01-01T02:00:00Z' },
      { pointId: 'P4', timestamp: '2026-01-01T03:00:00Z' },
    ],
    segments: [
      { segmentId: 'S1', startPointId: 'P1', endPointId: 'P2' },
      { segmentId: 'S2', startPointId: 'P2', endPointId: 'P3' },
      { segmentId: 'S3', startPointId: 'P1', endPointId: 'P3' },
      { segmentId: 'S4', startPointId: 'P3', endPointId: 'P4' },
    ],
    assetAssignments,
    personAssignments,
    proposedAssignment,
  });

describe('assetCustodianSegmentAssignmentPredicate', () => {
  test('rejects overlap for the asset', () =>
    expect(
      assetCustodianSegmentAssignmentPredicate(
        payload([{ assetId: 'A1', segmentId: 'S1' }], [], {
          assetId: 'A1',
          segmentId: 'S3',
          custodianPersonId: 'C1',
        })
      )
    ).toBe('false'));
  test('rejects overlap for the custodian person', () =>
    expect(
      assetCustodianSegmentAssignmentPredicate(
        payload([], [{ personId: 'C1', segmentId: 'S1' }], {
          assetId: 'A1',
          segmentId: 'S3',
          custodianPersonId: 'C1',
        })
      )
    ).toBe('false'));
  test('allows touching intervals when both are free', () =>
    expect(
      assetCustodianSegmentAssignmentPredicate(
        payload(
          [{ assetId: 'A1', segmentId: 'S1' }],
          [{ personId: 'C1', segmentId: 'S1' }],
          { assetId: 'A1', segmentId: 'S2', custodianPersonId: 'C1' }
        )
      )
    ).toBe('true'));
  test('allows independent asset and person assignments', () =>
    expect(
      assetCustodianSegmentAssignmentPredicate(
        payload(
          [{ assetId: 'A2', segmentId: 'S1' }],
          [{ personId: 'C2', segmentId: 'S1' }],
          { assetId: 'A1', segmentId: 'S4', custodianPersonId: 'C1' }
        )
      )
    ).toBe('true'));
  test('rejects when both the asset and custodian are occupied', () =>
    expect(
      assetCustodianSegmentAssignmentPredicate(
        payload(
          [{ assetId: 'A1', segmentId: 'S1' }],
          [{ personId: 'C1', segmentId: 'S1' }],
          { assetId: 'A1', segmentId: 'S3', custodianPersonId: 'C1' }
        )
      )
    ).toBe('false'));
  test('does not consider overlapping assignments belonging to other identities', () =>
    expect(
      assetCustodianSegmentAssignmentPredicate(
        payload(
          [
            { assetId: 'A2', segmentId: 'S3' },
            { assetId: 'A1', segmentId: 'S1' },
          ],
          [
            { personId: 'C2', segmentId: 'S3' },
            { personId: 'C1', segmentId: 'S1' },
          ],
          { assetId: 'A1', segmentId: 'S4', custodianPersonId: 'C1' }
        )
      )
    ).toBe('true'));
  test('filters unrelated assignments even when their intervals overlap', () =>
    expect(
      assetCustodianSegmentAssignmentPredicate(
        payload(
          [{ assetId: 'A2', segmentId: 'S3' }],
          [{ personId: 'C2', segmentId: 'S3' }],
          { assetId: 'A1', segmentId: 'S3', custodianPersonId: 'C1' }
        )
      )
    ).toBe('true'));

  test('returns false for malformed requests and incomplete assignments', () => {
    expect(assetCustodianSegmentAssignmentPredicate('{')).toBe('false');
    expect(
      assetCustodianSegmentAssignmentPredicate(
        payload([], [], { assetId: 'A1', segmentId: 'S1' })
      )
    ).toBe('false');
  });

  test('filters malformed assignments and rejects invalid intervals', () => {
    expect(
      assetCustodianSegmentAssignmentPredicate(
        payload(
          [null, [], {}, { assetId: 'A1', segmentId: 'S1' }],
          [null, [], {}, { personId: 'C1', segmentId: 'S1' }],
          { assetId: 'A1', segmentId: 'S2', custodianPersonId: 'C1' }
        )
      )
    ).toBe('true');
    expect(
      assetCustodianSegmentAssignmentPredicate(
        payload([{ assetId: 'A1', segmentId: 'missing' }], [], {
          assetId: 'A1',
          segmentId: 'S2',
          custodianPersonId: 'C1',
        })
      )
    ).toBe('false');
    expect(
      assetCustodianSegmentAssignmentPredicate(
        payload([], [], {
          assetId: 'A1',
          segmentId: 'S1',
          custodianPersonId: 'C1',
        }).replace('2026-01-01T01:00:00Z', 'invalid')
      )
    ).toBe('false');
  });

  test('exercises each normalization and request guard', () => {
    expect(assetCustodianSegmentAssignmentPredicate('[]')).toBe('false');
    const baseRequest = JSON.parse(
      payload([], [], {
        assetId: 'A1',
        segmentId: 'S1',
        custodianPersonId: 'C1',
      })
    );
    for (const key of [
      'points',
      'segments',
      'assetAssignments',
      'personAssignments',
    ]) {
      const request = { ...baseRequest };
      delete request[key];
      expect(
        assetCustodianSegmentAssignmentPredicate(JSON.stringify(request))
      ).toBe('false');
    }
    for (const proposedAssignment of [
      null,
      [],
      { assetId: '', segmentId: 'S1', custodianPersonId: 'C1' },
      { assetId: 'A1', segmentId: '', custodianPersonId: 'C1' },
      { assetId: 'A1', segmentId: 'S1', custodianPersonId: '' },
    ]) {
      expect(
        assetCustodianSegmentAssignmentPredicate(
          JSON.stringify({ ...baseRequest, proposedAssignment })
        )
      ).toBe('false');
    }
    expect(
      assetCustodianSegmentAssignmentPredicate(
        payload(
          [
            { assetId: '', segmentId: 'S1' },
            { assetId: 'A1', segmentId: '' },
          ],
          [
            { personId: '', segmentId: 'S1' },
            { personId: 'C1', segmentId: '' },
          ],
          { assetId: 'A1', segmentId: 'S2', custodianPersonId: 'C1' }
        )
      )
    ).toBe('true');
    expect(
      assetCustodianSegmentAssignmentPredicate(
        payload([], [], {
          assetId: 'A1',
          segmentId: 'S1',
          custodianPersonId: 'C1',
        }).replace(
          '"segments":[{"segmentId":"S1","startPointId":"P1","endPointId":"P2"}',
          '"segments":[{"segmentId":"S1","startPointId":"missing","endPointId":"P2"}'
        )
      )
    ).toBe('false');
  });

  test('covers pure parser and interval contracts', () => {
    const baseRequest = JSON.parse(
      payload([], [], {
        assetId: 'A1',
        segmentId: 'S1',
        custodianPersonId: 'C1',
      })
    );
    expect(parseRequest(JSON.stringify(baseRequest)).assetAssignments).toEqual(
      []
    );
    expect(
      parseRequest(
        JSON.stringify({
          ...baseRequest,
          assetAssignments: [null, { assetId: ' A1 ', segmentId: ' S1 ' }],
          personAssignments: [null, { personId: ' C1 ', segmentId: ' S1 ' }],
        })
      )
    ).toMatchObject({
      assetAssignments: [{ assetId: 'A1', segmentId: 'S1' }],
      personAssignments: [{ personId: 'C1', segmentId: 'S1' }],
    });
    expect(normalizeAsset({ assetId: ' A1 ', segmentId: ' S1 ' })).toEqual({
      assetId: 'A1',
      segmentId: 'S1',
    });
    expect(normalizeAsset({ assetId: 1, segmentId: 2 })).toEqual({
      assetId: '1',
      segmentId: '2',
    });
    expect(normalizeAsset({ assetId: null, segmentId: 'S1' })).toBeNull();
    expect(normalizePerson({ personId: ' C1 ', segmentId: ' S1 ' })).toEqual({
      personId: 'C1',
      segmentId: 'S1',
    });
    expect(normalizePerson({ personId: 1, segmentId: 2 })).toEqual({
      personId: '1',
      segmentId: '2',
    });
    expect(normalizePerson({ personId: null, segmentId: 'S1' })).toBeNull();
    expect(normalizeProposed(baseRequest.proposedAssignment)).toEqual(
      baseRequest.proposedAssignment
    );
    expect(
      normalizeProposed({ assetId: 1, segmentId: 2, custodianPersonId: 3 })
    ).toEqual({ assetId: '1', segmentId: '2', custodianPersonId: '3' });
    expect(
      normalizeProposed({
        assetId: { toString: () => 'A1' },
        segmentId: { toString: () => 'S1' },
        custodianPersonId: { toString: () => 'C1' },
      })
    ).toEqual({ assetId: 'A1', segmentId: 'S1', custodianPersonId: 'C1' });
    expect(
      normalizeProposed({
        assetId: null,
        segmentId: 'S1',
        custodianPersonId: 'C1',
      })
    ).toBeNull();
    expect(
      normalizeProposed({
        assetId: 'A1',
        segmentId: null,
        custodianPersonId: 'C1',
      })
    ).toBeNull();
    expect(
      normalizeProposed({
        assetId: 'A1',
        segmentId: 'S1',
        custodianPersonId: null,
      })
    ).toBeNull();
    expect(() =>
      parseRequest(JSON.stringify({ ...baseRequest, proposedAssignment: null }))
    ).toThrow('A complete proposed assignment is required.');
    expect(normalizeAsset(null)).toBeNull();
    expect(normalizePerson([])).toBeNull();
    expect(normalizeProposed({ assetId: 'A1', segmentId: 'S1' })).toBeNull();
    const points = new Map(
      baseRequest.points.map(point => [point.pointId, point])
    );
    const segments = new Map(
      baseRequest.segments.map(segment => [segment.segmentId, segment])
    );
    expect(resolveInterval(segments, points, 'S1').startTime).toBe(
      Date.parse(baseRequest.points[0].timestamp)
    );
    expect(() => resolveInterval(segments, points, 'missing')).toThrow(
      'Unknown segment: missing'
    );
    expect(() => resolveInterval(segments, points, 'S1')).not.toThrow();
    expect(() =>
      resolveInterval(
        new Map([['S', { startPointId: 'P1', endPointId: 'missing' }]]),
        points,
        'S'
      )
    ).toThrow('unknown point');
    expect(() =>
      resolveInterval(
        new Map([['S', { startPointId: 'P2', endPointId: 'P1' }]]),
        points,
        'S'
      )
    ).toThrow('ordered valid time interval');
    expect(
      resolveInterval(
        new Map([['S', { startPointId: 'P1', endPointId: 'P1' }]]),
        points,
        'S'
      )
    ).toEqual({
      startTime: Date.parse(baseRequest.points[0].timestamp),
      endTime: Date.parse(baseRequest.points[0].timestamp),
    });
    expect(
      overlaps({ startTime: 0, endTime: 1 }, { startTime: 1, endTime: 2 })
    ).toBe(false);
  });
});
