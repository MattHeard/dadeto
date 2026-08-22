import { describe, expect, test } from '@jest/globals';
import { assetCustodianSegmentAssignmentPredicate } from '../../../src/core/browser/toys/2026-08-20/assetCustodianSegmentAssignmentPredicate.js';

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
});
