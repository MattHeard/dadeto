import { describe, expect, test } from '@jest/globals';
import { assetRegistry } from '../../../src/core/browser/toys/2026-08-16/assetRegistry.js';
import { parseObjectRecord } from '../../../src/core/browser/validation.js';

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
              notes: 'Store indoors',
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
            { assetId: 'blanket-003' },
          ],
        })
      )
    );

    expect(result.assets.map(asset => asset.assetId)).toEqual([
      'blanket-001',
      'blanket-002',
      'blanket-003',
    ]);
    expect(result.assets[0]).toMatchObject({
      sku: 'picnic-blanket',
      condition: 'Good',
      availability: 'Available',
      resetRequired: true,
    });
    expect(result.assets[0].notes).toBeUndefined();
    expect(result.assets[1]).toEqual({
      assetId: 'blanket-002',
      sku: 'picnic-blanket',
      name: 'blanket-002',
      storageLocation: 'unknown-location',
      condition: 'Unknown',
      availability: 'Reserved',
      owner: 'unknown-owner',
      resetRequired: false,
      notes: 'Store indoors',
    });
    expect(result.assets[2]).toEqual({
      assetId: 'blanket-003',
      sku: 'unknown-sku',
      name: 'blanket-003',
      storageLocation: 'unknown-location',
      condition: 'Unknown',
      availability: 'Available',
      owner: 'unknown-owner',
      resetRequired: false,
    });
    expect(result.summary).toEqual({
      assetCount: 3,
      availableCount: 2,
      skuCount: 2,
    });
  });

  test('accepts already-parsed object records', () => {
    expect(parseObjectRecord({ assets: [] })).toEqual({ assets: [] });
  });

  test('uses the one-based source index when assetId is absent', () => {
    const result = JSON.parse(
      assetRegistry(JSON.stringify({ assets: [{ sku: 'sku-1' }] }))
    );
    expect(result.assets[0].assetId).toBe('asset-1');
    expect(result.assets[0].name).toBe('asset-1');
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
