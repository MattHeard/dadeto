import { describe, expect, test } from '@jest/globals';
import { possessionRequest } from '../../../src/core/browser/toys/2026-08-17/possessionRequest.js';

describe('possessionRequest', () => {
  test('normalizes a valid request to six-decimal coordinates and UTC minutes', () => {
    const result = JSON.parse(
      possessionRequest(
        JSON.stringify({
          sku: ' picnic-blanket ',
          deliveryLocation: { lat: 52.477389123, lon: 13.415139987 },
          deliveryTime: '2026-08-21T18:00Z',
          pickupLocation: { lat: 52.4773899, lon: 13.4151391 },
          pickupTime: '2026-08-21T20:00Z',
        })
      )
    );

    expect(result).toEqual({
      valid: true,
      request: {
        sku: 'picnic-blanket',
        deliveryLocation: { lat: 52.477389, lon: 13.41514 },
        deliveryTime: '2026-08-21T18:00Z',
        pickupLocation: { lat: 52.47739, lon: 13.415139 },
        pickupTime: '2026-08-21T20:00Z',
      },
    });
  });

  test('returns deterministic errors for malformed fields', () => {
    const result = JSON.parse(
      possessionRequest(
        JSON.stringify({
          sku: '',
          deliveryLocation: { lat: 91, lon: 181 },
          deliveryTime: 'tomorrow',
          pickupLocation: null,
          pickupTime: '2026-08-21T20:30:00+01:00',
        })
      )
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'sku must be a non-empty string',
      'deliveryLocation.lat must be between -90 and 90',
      'deliveryLocation.lon must be between -180 and 180',
      'deliveryTime must be a valid UTC minute like 2026-08-21T18:00Z',
      'pickupLocation must contain numeric lat and lon',
      'pickupTime must be a valid UTC minute like 2026-08-21T18:00Z',
    ]);
  });

  test('returns errors for invalid JSON', () => {
    expect(JSON.parse(possessionRequest('{'))).toEqual({
      valid: false,
      errors: [
        'sku must be a non-empty string',
        'deliveryLocation must contain numeric lat and lon',
        'deliveryTime must be a valid UTC minute like 2026-08-21T18:00Z',
        'pickupLocation must contain numeric lat and lon',
        'pickupTime must be a valid UTC minute like 2026-08-21T18:00Z',
      ],
    });
  });

  test('rejects non-object locations and non-finite coordinates', () => {
    const result = JSON.parse(
      possessionRequest(
        JSON.stringify({
          sku: 42,
          deliveryLocation: [],
          deliveryTime: '2026-02-30T18:00',
          pickupLocation: { lat: '52', lon: null },
          pickupTime: null,
        })
      )
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'sku must be a non-empty string',
      'deliveryLocation must contain numeric lat and lon',
      'deliveryTime must be a valid UTC minute like 2026-08-21T18:00Z',
      'pickupLocation.lat must be between -90 and 90',
      'pickupLocation.lon must be between -180 and 180',
      'pickupTime must be a valid UTC minute like 2026-08-21T18:00Z',
    ]);

    const scalarLocations = JSON.parse(
      possessionRequest(JSON.stringify({
        sku: 'ok',
        deliveryLocation: 0,
        deliveryTime: '2026-08-21T18:00Z',
        pickupLocation: true,
        pickupTime: '2026-08-21T20:00Z',
      }))
    );
    expect(scalarLocations.errors).toEqual([
      'deliveryLocation must contain numeric lat and lon',
      'pickupLocation must contain numeric lat and lon',
    ]);
  });

  test('accepts inclusive coordinate bounds and rejects adjacent values', () => {
    const valid = JSON.parse(
      possessionRequest(JSON.stringify({
        sku: 'edge',
        deliveryLocation: { lat: -90, lon: -180 },
        deliveryTime: '2026-08-21T18:00Z',
        pickupLocation: { lat: 90, lon: 180 },
        pickupTime: '2026-08-21T20:00Z',
      }))
    );
    expect(valid.valid).toBe(true);

    const invalid = JSON.parse(
      possessionRequest(JSON.stringify({
        sku: 'edge',
        deliveryLocation: { lat: -90.000001, lon: -180.000001 },
        deliveryTime: 'x2026-08-21T18:00Z',
        pickupLocation: { lat: 90.000001, lon: 180.000001 },
        pickupTime: '2026-08-21T20:00Zsuffix',
      }))
    );
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toHaveLength(6);
  });
});
