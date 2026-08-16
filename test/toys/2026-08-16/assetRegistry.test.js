import { describe, expect, test } from '@jest/globals';
import { assetRegistry } from '../../../src/core/browser/toys/2026-08-16/assetRegistry.js';

describe('assetRegistry', () => {
  test('normalizes, sorts, and summarizes physical assets', () => {
    const result = JSON.parse(
      assetRegistry(
        JSON.stringify({
          assets: [
            {
              assetId: 'blanket-002',
              sku: 'picnic-blanket',
              availability: 'Reserved',
            },
            {
              assetId: 'blanket-001',
              sku: 'picnic-blanket',
              name: 'IKEA picnic blanket',
              storageLocation: 'matt-home',
              condition: 'Good',
              owner: 'matt',
              resetRequired: true,
            },
          ],
        })
      )
    );

    expect(result.assets.map(asset => asset.assetId)).toEqual([
      'blanket-001',
      'blanket-002',
    ]);
    expect(result.assets[0]).toMatchObject({
      sku: 'picnic-blanket',
      condition: 'Good',
      availability: 'Available',
      resetRequired: true,
    });
    expect(result.summary).toEqual({
      assetCount: 2,
      availableCount: 1,
      skuCount: 1,
    });
  });

  test('returns an empty registry for invalid input and ignores malformed assets', () => {
    expect(JSON.parse(assetRegistry('{'))).toEqual({
      assets: [],
      summary: { assetCount: 0, availableCount: 0, skuCount: 0 },
    });
    expect(
      JSON.parse(assetRegistry(JSON.stringify({ assets: [null, 'bad'] })))
    ).toEqual({
      assets: [],
      summary: { assetCount: 0, availableCount: 0, skuCount: 0 },
    });
  });
});
