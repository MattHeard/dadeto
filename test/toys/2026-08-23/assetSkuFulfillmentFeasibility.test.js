import { describe, expect, test } from '@jest/globals';
import { existingAssetFulfillmentFeasibility } from '../../../src/core/browser/toys/2026-08-23/existingAssetFulfillmentFeasibility.js';
import { skuExistingStockFeasibility } from '../../../src/core/browser/toys/2026-08-23/skuExistingStockFeasibility.js';
import { skuFulfillmentFeasibility } from '../../../src/core/browser/toys/2026-08-23/skuFulfillmentFeasibility.js';

const spacePoints = [
  { spacePointId: 'CUSTOMER', latitude: '52.500000', longitude: '13.400000' },
  { spacePointId: 'WAREHOUSE', latitude: '52.123456', longitude: '13.123456' },
];
const points = [
  {
    pointId: 'STOCK',
    spacePointId: 'WAREHOUSE',
    timestamp: '2026-08-23T10:00Z',
  },
  { pointId: 'D0', spacePointId: 'WAREHOUSE', timestamp: '2026-08-23T11:15Z' },
  { pointId: 'P1', spacePointId: 'CUSTOMER', timestamp: '2026-08-23T12:00Z' },
  { pointId: 'P2', spacePointId: 'CUSTOMER', timestamp: '2026-08-23T14:00Z' },
  { pointId: 'D3', spacePointId: 'WAREHOUSE', timestamp: '2026-08-23T14:45Z' },
  { pointId: 'D4', spacePointId: 'WAREHOUSE', timestamp: '2026-08-23T15:00Z' },
  { pointId: 'D5', spacePointId: 'WAREHOUSE', timestamp: '2026-08-23T16:00Z' },
];
const segments = [
  { segmentId: 'S0', startPointId: 'D0', endPointId: 'P1' },
  { segmentId: 'POS', startPointId: 'P1', endPointId: 'P2' },
  { segmentId: 'S3', startPointId: 'P2', endPointId: 'D3' },
  { segmentId: 'S4', startPointId: 'D3', endPointId: 'D4' },
  { segmentId: 'S5', startPointId: 'D4', endPointId: 'D5' },
];
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
  assetId: 'ASSET-B',
  sku: 'SKU-1',
  stockInPoint: points[0],
  existingSegments: [],
};

describe('EXIS1 existing asset fulfillment feasibility', () => {
  test('evaluates only asset-relevant proposal operations', () => {
    expect(
      JSON.parse(
        existingAssetFulfillmentFeasibility(
          JSON.stringify({ asset, proposal, points, spacePoints })
        )
      )
    ).toMatchObject({ feasible: true });
  });

  test('rejects a conflicting committed asset segment without mutation', () => {
    const existingSegments = [
      { segmentId: 'BLOCK', startPointId: 'D0', endPointId: 'P1' },
    ];
    const before = JSON.stringify(existingSegments);
    const result = JSON.parse(
      existingAssetFulfillmentFeasibility(
        JSON.stringify({
          asset: { ...asset, existingSegments },
          proposal,
          points,
          spacePoints,
        })
      )
    );
    expect(result.feasible).toBe(false);
    expect(JSON.stringify(existingSegments)).toBe(before);
  });
});

describe('SKUE1 SKU existing-stock feasibility', () => {
  test('sorts matching assets and stops at the first feasible asset', () => {
    const result = JSON.parse(
      skuExistingStockFeasibility(
        JSON.stringify({
          requestedSku: 'SKU-1',
          assets: [
            { ...asset, assetId: 'ASSET-B' },
            {
              ...asset,
              assetId: 'ASSET-A',
              existingSegments: [
                { segmentId: 'BLOCK', startPointId: 'D0', endPointId: 'P1' },
              ],
            },
            { ...asset, assetId: 'ASSET-C', sku: 'OTHER' },
          ],
          proposal,
          points,
          spacePoints,
        })
      )
    );
    expect(result).toEqual({ feasible: true });
  });

  test('returns false when the requested SKU is absent', () => {
    expect(
      JSON.parse(
        skuExistingStockFeasibility(
          JSON.stringify({ requestedSku: 'NONE', assets: [] })
        )
      )
    ).toEqual({ feasible: false });
  });
});

describe('SKUF1 SKU fulfillment feasibility', () => {
  test('is the OR of the two precomputed branches', () => {
    expect(
      JSON.parse(skuFulfillmentFeasibility('{"procurementFeasible":true}'))
    ).toEqual({ feasible: true });
    expect(
      JSON.parse(skuFulfillmentFeasibility('{"existingStockFeasible":true}'))
    ).toEqual({ feasible: true });
    expect(JSON.parse(skuFulfillmentFeasibility('{}'))).toEqual({
      feasible: false,
    });
  });

  test('returns false for malformed input', () => {
    expect(JSON.parse(skuFulfillmentFeasibility('{'))).toEqual({
      feasible: false,
    });
  });
});
