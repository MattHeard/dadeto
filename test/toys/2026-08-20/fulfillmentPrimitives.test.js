import { describe, expect, test } from '@jest/globals';
import { spacetimeWorldLinePairPredicate } from '../../../src/core/browser/toys/2026-08-20/spacetimeWorldLinePairPredicate.js';
import { wgs84CirclePointPredicate } from '../../../src/core/browser/toys/2026-08-20/wgs84CirclePointPredicate.js';
import { wgs84CircleSegmentPredicate } from '../../../src/core/browser/toys/2026-08-20/wgs84CircleSegmentPredicate.js';
import { constantSpeedGeodesicTravelDuration } from '../../../src/core/browser/toys/2026-08-20/constantSpeedGeodesicTravelDuration.js';
import { deliveryOutboundSegmentProposal } from '../../../src/core/browser/toys/2026-08-20/deliveryOutboundSegmentProposal.js';
import { pickupReturnSegmentProposal } from '../../../src/core/browser/toys/2026-08-20/pickupReturnSegmentProposal.js';
import { possessionContextRegistry } from '../../../src/core/browser/toys/2026-08-20/possessionContextRegistry.js';
import { assetPossessionSegmentCandidateFilter } from '../../../src/core/browser/toys/2026-08-20/assetPossessionSegmentCandidateFilter.js';

const points = [
  {
    pointId: 'A',
    latitude: 0,
    longitude: 0,
    timestamp: '2026-01-01T00:00:00Z',
  },
  {
    pointId: 'B',
    latitude: 0,
    longitude: 0.01,
    timestamp: '2026-01-01T01:00:00Z',
  },
  {
    pointId: 'C',
    latitude: 0,
    longitude: 0.02,
    timestamp: '2026-01-01T02:00:00Z',
  },
];
const segments = [
  { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
  { segmentId: 'BC', startPointId: 'B', endPointId: 'C' },
];

describe('fulfillment primitives', () => {
  test('SPAC7 allows identical-point touching', () =>
    expect(
      spacetimeWorldLinePairPredicate(
        JSON.stringify({
          points,
          segments,
          firstSegmentId: 'AB',
          secondSegmentId: 'BC',
        })
      )
    ).toBe('true'));
  test('AREA1 includes the center and excludes a distant point', () => {
    const circle = { center: { latitude: 0, longitude: 0 }, radiusMeters: 100 };
    expect(
      wgs84CirclePointPredicate(
        JSON.stringify({ circle, point: { latitude: 0, longitude: 0 } })
      )
    ).toBe('true');
    expect(
      wgs84CirclePointPredicate(
        JSON.stringify({ circle, point: { latitude: 1, longitude: 1 } })
      )
    ).toBe('false');
  });
  test('AREA2 requires both endpoints', () =>
    expect(
      wgs84CircleSegmentPredicate(
        JSON.stringify({
          points,
          segment: segments[0],
          circle: { center: { latitude: 0, longitude: 0 }, radiusMeters: 500 },
        })
      )
    ).toBe('false'));
  test('TRAV1 returns seconds', () =>
    expect(
      JSON.parse(
        constantSpeedGeodesicTravelDuration(
          JSON.stringify({
            points,
            segment: segments[0],
            speedKilometersPerHour: 10,
          })
        )
      ).unit
    ).toBe('seconds'));
  test('FULF proposals preserve endpoint identity and quantize minutes', () => {
    const outbound = JSON.parse(
      deliveryOutboundSegmentProposal(
        JSON.stringify({
          possessionStartPoint: points[1],
          origin: { latitude: 0, longitude: 0 },
          travelDurationSeconds: 61,
          startPointId: 'O',
          segmentId: 'OUT',
        })
      )
    );
    const pickup = JSON.parse(
      pickupReturnSegmentProposal(
        JSON.stringify({
          possessionEndPoint: points[1],
          destination: { latitude: 0, longitude: 0 },
          travelDurationSeconds: 61,
          endPointId: 'D',
          segmentId: 'RET',
        })
      )
    );
    expect(outbound.segment.endPointId).toBe('B');
    expect(pickup.segment.startPointId).toBe('B');
  });
  test('POSS2 normalizes and sorts contexts', () =>
    expect(
      JSON.parse(
        possessionContextRegistry(
          JSON.stringify({
            possessionContexts: [
              { possessionContextId: 'B', sku: 'S', segmentId: 'X' },
              { possessionContextId: 'A', sku: 'S', segmentId: 'Y' },
            ],
          })
        )
      ).possessionContexts.map(x => x.possessionContextId)
    ).toEqual(['A', 'B']));
  test('ASSE6 filters SKU and temporal conflicts', () => {
    const result = JSON.parse(
      assetPossessionSegmentCandidateFilter(
        JSON.stringify({
          assets: [
            { assetId: 'A1', sku: 'S' },
            { assetId: 'A2', sku: 'S' },
            { assetId: 'A3', sku: 'T' },
          ],
          points,
          segments,
          existingAssetAssignments: [{ assetId: 'A1', segmentId: 'AB' }],
          requestedSku: 'S',
          possessionSegmentId: 'BC',
        })
      )
    );
    expect(result).toEqual(['A1', 'A2']);
  });
});
