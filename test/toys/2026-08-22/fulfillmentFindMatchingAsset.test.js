import { expect, test } from '@jest/globals';
import { fulfillmentFindMatchingAsset } from '../../../src/core/browser/toys/2026-08-22/fulfillmentResult.js';

test('formats a successful matching-asset feasibility result', () => {
  expect(
    fulfillmentFindMatchingAsset(
      {
        requestedSku: 'sku-1',
        assets: [{ sku: 'sku-1', assetId: 'asset-1' }],
      },
      () => JSON.stringify({ feasible: true })
    )
  ).toBe('{"feasible":true}');
});

test('formats an unsuccessful result when no matching asset is feasible', () => {
  expect(
    fulfillmentFindMatchingAsset(
      {
        requestedSku: 'sku-1',
        assets: [{ sku: 'sku-1', assetId: 'asset-1' }],
      },
      () => JSON.stringify({ feasible: false })
    )
  ).toBe('{"feasible":false}');
});
