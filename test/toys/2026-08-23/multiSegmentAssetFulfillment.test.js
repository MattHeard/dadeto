import { describe, expect, test } from '@jest/globals';
import { existingAssetFulfillmentSequenceFeasibility } from '../../../src/core/browser/toys/2026-08-23/existingAssetFulfillmentSequenceFeasibility.js';
import { skuExistingStockFulfillmentFeasibility } from '../../../src/core/browser/toys/2026-08-23/skuExistingStockFulfillmentFeasibility.js';

const spacePoints = [
  { spacePointId: 'CUSTOMER', latitude: '52.500000', longitude: '13.400000' },
  { spacePointId: 'WAREHOUSE', latitude: '52.123456', longitude: '13.123456' },
];
const points = [
  ['STOCK', 'WAREHOUSE', '10:00'],
  ['D0', 'WAREHOUSE', '11:15'],
  ['P1', 'CUSTOMER', '12:00'],
  ['P2', 'CUSTOMER', '14:00'],
  ['D3', 'WAREHOUSE', '14:45'],
  ['D4', 'WAREHOUSE', '15:00'],
  ['D5', 'WAREHOUSE', '16:00'],
].map(([pointId, spacePointId, time]) => ({
  pointId,
  spacePointId,
  timestamp: `2026-08-23T${time}Z`,
}));

const segments = [
  ['S0', 'D0', 'P1'],
  ['POS', 'P1', 'P2'],
  ['S3', 'P2', 'D3'],
  ['S4', 'D3', 'D4'],
  ['S5', 'D4', 'D5'],
].map(([segmentId, startPointId, endPointId]) => ({
  segmentId,
  startPointId,
  endPointId,
}));

const proposal = {
  valid: true,
  points,
  spacePoints,
  segments: [
    ...segments,
    { segmentId: 'RETURN', startPointId: 'P1', endPointId: 'D3' },
    { segmentId: 'OUT', startPointId: 'D4', endPointId: 'P2' },
  ],
  sequence: [
    { operation: 'delivery-outbound', segmentId: 'S0' },
    { operation: 'delivery-return', segmentId: 'RETURN' },
    { operation: 'possession', segmentId: 'POS' },
    { operation: 'pickup-outbound', segmentId: 'OUT' },
    { operation: 'pickup-return', segmentId: 'S3' },
    { operation: 'inspection', segmentId: 'S4' },
    { operation: 'cleaning', segmentId: 'S5' },
  ],
};
const asset = {
  assetId: 'ASSET-1',
  sku: 'SKU-1',
  stockInPoint: points[0],
  existingSegments: [],
};

/**
 * @param {string} pointId Point ID.
 * @param {string} spacePointId Space point ID.
 * @param {string} time Timestamp time.
 * @returns {Record<string, string>} A test point.
 */
function point(pointId, spacePointId, time) {
  return {
    pointId,
    spacePointId,
    timestamp: `2026-08-23T${time}Z`,
  };
}

/**
 * @param {Array<string>} args Segment ID, point IDs, times, and optional location.
 * @returns {Record<string, unknown>} A test segment with its points.
 */
function blockedSegment(...args) {
  const [segmentId, startId, endId, start, end, location = 'CUSTOMER'] = args;
  return {
    segmentId,
    startPointId: startId,
    endPointId: endId,
    points: [point(startId, location, start), point(endId, location, end)],
  };
}

/**
 * @param {Array<Record<string, unknown>>} existingSegments Existing segments.
 * @returns {Record<string, unknown>} Feasibility result.
 */
function evaluate(existingSegments = []) {
  const extraPoints = existingSegments.flatMap(segment => segment.points || []);
  const segmentsWithoutPoints = existingSegments.map(segment => {
    const copy = { ...segment };
    delete copy.points;
    return copy;
  });
  return JSON.parse(
    existingAssetFulfillmentSequenceFeasibility(
      JSON.stringify({
        asset: { ...asset, existingSegments: segmentsWithoutPoints },
        proposal,
        points: [...points, ...extraPoints],
        spacePoints,
      })
    )
  );
}

describe('EXIS2 multi-segment existing asset feasibility', () => {
  test('accepts the complete five-segment asset sequence', () => {
    expect(evaluate()).toEqual({ feasible: true });
  });

  test.each([
    [
      'delivery',
      blockedSegment('BLOCK-D', 'BD0', 'BD1', '11:20', '11:40', 'WAREHOUSE'),
    ],
    ['possession', blockedSegment('BLOCK-P', 'BP0', 'BP1', '13:00', '13:30')],
    [
      'pickup return',
      blockedSegment('BLOCK-R', 'BR0', 'BR1', '14:15', '14:30'),
    ],
    [
      'inspection',
      blockedSegment('BLOCK-I', 'BI0', 'BI1', '14:50', '14:55', 'WAREHOUSE'),
    ],
    [
      'cleaning',
      blockedSegment('BLOCK-C', 'BC0', 'BC1', '15:15', '15:30', 'WAREHOUSE'),
    ],
  ])('rejects a conflict during %s', (_phase, conflict) => {
    expect(evaluate([conflict])).toMatchObject({ feasible: false });
  });

  test('rejects touching segments with different point IDs', () => {
    const changedProposal = {
      ...proposal,
      points: [...proposal.points, point('OTHER-P2', 'CUSTOMER', '14:00')],
      segments: proposal.segments.map(segment =>
        segment.segmentId === 'POS'
          ? { ...segment, endPointId: 'OTHER-P2' }
          : segment
      ),
    };
    expect(
      JSON.parse(
        existingAssetFulfillmentSequenceFeasibility(
          JSON.stringify({
            asset,
            proposal: changedProposal,
            points,
            spacePoints,
          })
        )
      )
    ).toMatchObject({ feasible: false });
  });

  test('rejects duplicate candidate segment IDs rather than overwriting', () => {
    const duplicate = {
      ...proposal,
      sequence: proposal.sequence.map(operation =>
        operation.operation === 'cleaning'
          ? { ...operation, segmentId: 'S4' }
          : operation
      ),
    };
    expect(
      JSON.parse(
        existingAssetFulfillmentSequenceFeasibility(
          JSON.stringify({ asset, proposal: duplicate, points, spacePoints })
        )
      )
    ).toMatchObject({ feasible: false });
  });
});

describe('SKUE2 SKU existing-stock fulfillment feasibility', () => {
  test('checks matching assets in lexical order and reaches later-operation conflicts', () => {
    const lateConflict = blockedSegment(
      'BLOCK-LATE',
      'X0',
      'X1',
      '15:15',
      '15:30',
      'WAREHOUSE'
    );
    const earlyConflict = blockedSegment(
      'BLOCK-EARLY',
      'Y0',
      'Y1',
      '13:00',
      '13:30'
    );
    const result = JSON.parse(
      skuExistingStockFulfillmentFeasibility(
        JSON.stringify({
          requestedSku: 'SKU-1',
          assets: [
            {
              ...asset,
              assetId: 'ASSET-002',
              existingSegments: [lateConflict],
            },
            {
              ...asset,
              assetId: 'ASSET-001',
              existingSegments: [earlyConflict],
            },
            { ...asset, assetId: 'OTHER', sku: 'OTHER-SKU' },
          ],
          proposal,
          points: [...points, ...lateConflict.points, ...earlyConflict.points],
          spacePoints,
        })
      )
    );
    expect(result).toEqual({ feasible: false });
  });

  test('short-circuits on the first feasible matching asset', () => {
    const result = JSON.parse(
      skuExistingStockFulfillmentFeasibility(
        JSON.stringify({
          requestedSku: 'SKU-1',
          assets: [
            asset,
            {
              ...asset,
              assetId: 'ASSET-2',
              stockInPoint: { ...asset.stockInPoint, pointId: 'MISSING' },
            },
          ],
          proposal,
          points,
          spacePoints,
        })
      )
    );
    expect(result).toEqual({ feasible: true });
  });
});
