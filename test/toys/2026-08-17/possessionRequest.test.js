import { describe, expect, test } from '@jest/globals';
import { possessionRequest } from '../../../src/core/browser/toys/2026-08-17/possessionRequest.js';

describe('possessionRequest', () => {
  test('normalizes a valid request to six-decimal coordinates and UTC minutes', () => {
    const result = JSON.parse(possessionRequest(JSON.stringify({
      sku: ' picnic-blanket ',
      deliveryLocation: { lat: 52.477389123, lon: 13.415139987 },
      deliveryTime: '2026-08-21T18:00Z',
      pickupLocation: { lat: 52.4773899, lon: 13.4151391 },
      pickupTime: '2026-08-21T20:00Z',
    })));

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
    const result = JSON.parse(possessionRequest(JSON.stringify({
      sku: '',
      deliveryLocation: { lat: 91, lon: 181 },
      deliveryTime: 'tomorrow',
      pickupLocation: null,
      pickupTime: '2026-08-21T20:30:00+01:00',
    })));

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
});
