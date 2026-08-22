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
  test('AREA1 accepts the exact zero-distance boundary', () => {
    const circle = { center: { latitude: 0, longitude: 0 }, radiusMeters: 0 };
    expect(
      wgs84CirclePointPredicate(
        JSON.stringify({
          circle,
          point: { latitude: 0, longitude: 0 },
        })
      )
    ).toBe('true');
    expect(
      wgs84CirclePointPredicate(
        JSON.stringify({
          circle: { center: { latitude: 90, longitude: 180 }, radiusMeters: 0 },
          point: { latitude: 90, longitude: 180 },
        })
      )
    ).toBe('true');
  });
  test('AREA1 resolves referenced space-point coordinates', () => {
    expect(wgs84CirclePointPredicate(JSON.stringify({
      circle: { center: { latitude: 0, longitude: 0 }, radiusMeters: 100 },
      point: { pointId: 'P', spacePointId: 'SP' },
      spacePoints: [{ spacePointId: 'SP', latitude: 0, longitude: 0 }],
    }))).toBe('true');
    expect(wgs84CirclePointPredicate(JSON.stringify({
      circle: { center: { latitude: 0, longitude: 0 }, radiusMeters: 100 },
      point: { pointId: 'P', latitude: 0, longitude: 0 },
      spacePoints: null,
    }))).toBe('false');
  });
  test('AREA1 rejects missing, non-finite, negative, and out-of-range values', () => {
    const validPoint = { latitude: 0, longitude: 0 };
    const validCircle = {
      center: { latitude: 0, longitude: 0 },
      radiusMeters: 100,
    };
    const invalidInputs = [
      {},
      { circle: {}, point: validPoint },
      { circle: validCircle, point: {} },
      { circle: { ...validCircle, radiusMeters: -1 }, point: validPoint },
      { circle: { ...validCircle, radiusMeters: 'nope' }, point: validPoint },
      {
        circle: {
          ...validCircle,
          radiusMeters: 20_000_000,
          center: { latitude: 91, longitude: 0 },
        },
        point: validPoint,
      },
      {
        circle: {
          ...validCircle,
          radiusMeters: 20_000_000,
          center: { latitude: 0, longitude: 181 },
        },
        point: validPoint,
      },
      {
        circle: { ...validCircle, radiusMeters: 20_000_000 },
        point: { latitude: 91, longitude: 0 },
      },
      {
        circle: { ...validCircle, radiusMeters: 20_000_000 },
        point: { latitude: 0, longitude: 181 },
      },
    ];
    for (const value of invalidInputs) {
      expect(wgs84CirclePointPredicate(JSON.stringify(value))).toBe('false');
    }
    expect(wgs84CirclePointPredicate('not json')).toBe('false');
    expect(wgs84CirclePointPredicate('')).toBe('false');
    expect(
      wgs84CirclePointPredicate(
        JSON.stringify({ circle: { center: { latitude: 0, longitude: 0 }, radiusMeters: 1 }, point: { latitude: 91, longitude: 0 } })
      )
    ).toBe('false');
    expect(
      wgs84CirclePointPredicate(
        JSON.stringify({ circle: { center: { latitude: 0, longitude: 181 }, radiusMeters: 1 }, point: { latitude: 0, longitude: 0 } })
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
  test('AREA2 returns true only when both endpoints are inside the circle', () => {
    const circle = {
      center: { latitude: 0, longitude: 0 },
      radiusMeters: 2000,
    };
    expect(
      wgs84CircleSegmentPredicate(
        JSON.stringify({
          points,
          segment: segments[0],
          circle,
        })
      )
    ).toBe('true');
    expect(
      wgs84CircleSegmentPredicate(
        JSON.stringify({
          points,
          segment: segments[1],
          circle: { ...circle, radiusMeters: 100 },
        })
      )
    ).toBe('false');
    expect(
      wgs84CircleSegmentPredicate(
        JSON.stringify({
          points,
          segment: segments[0],
          circle: { ...circle, radiusMeters: 100 },
        })
      )
    ).toBe('false');
    expect(
      wgs84CircleSegmentPredicate(
        JSON.stringify({
          points,
          segment: { startPointId: 'B', endPointId: 'A' },
          circle: { ...circle, radiusMeters: 100 },
        })
      )
    ).toBe('false');
  });
  test('AREA2 rejects malformed, missing, and incomplete segment input', () => {
    expect(wgs84CircleSegmentPredicate('not json')).toBe('false');
    expect(wgs84CircleSegmentPredicate('{}')).toBe('false');
    expect(wgs84CircleSegmentPredicate('null')).toBe('false');
    expect(wgs84CircleSegmentPredicate(JSON.stringify({ points: {}, segment: {} }))).toBe(
      'false'
    );
    expect(wgs84CircleSegmentPredicate(JSON.stringify({ points: [], segment: null }))).toBe(
      'false'
    );
    expect(wgs84CircleSegmentPredicate(JSON.stringify({ points }))).toBe(
      'false'
    );
    expect(
      wgs84CircleSegmentPredicate(
        JSON.stringify({
          points,
          segment: { startPointId: 'A' },
          circle: { center: { latitude: 0, longitude: 0 }, radiusMeters: 2000 },
        })
      )
    ).toBe('false');
  });
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
  test('TRAV1 preserves the exact distance-to-duration conversion', () => {
    const result = JSON.parse(
      constantSpeedGeodesicTravelDuration(
        JSON.stringify({
          points: [
            { pointId: 'A', latitude: 0, longitude: 0 },
            { pointId: 'B', latitude: 0.01, longitude: 10 },
          ],
          segment: { startPointId: 'A', endPointId: 'B' },
          speedKilometersPerHour: 10,
        })
      )
    );
    expect(result).toEqual({ value: '400750.3625317416', unit: 'seconds' });
  });
  test('TRAV1 reports exact input and coordinate validation errors', () => {
    expect(JSON.parse(constantSpeedGeodesicTravelDuration('{}'))).toEqual({
      valid: false,
      error: 'Valid segment points and positive speed are required.',
    });
    for (const value of [
      'null',
      JSON.stringify({ points: {}, segment: {} }),
      JSON.stringify({ points: [], segment: null }),
    ]) {
      expect(JSON.parse(constantSpeedGeodesicTravelDuration(value))).toEqual({
        valid: false,
        error: 'Valid segment points and positive speed are required.',
      });
    }
    expect(JSON.parse(constantSpeedGeodesicTravelDuration(JSON.stringify({
      points,
      segment: { startPointId: 'A', endPointId: 'B' },
      speedKilometersPerHour: 0,
    })))).toEqual({
      valid: false,
      error: 'Valid segment points and positive speed are required.',
    });
    expect(JSON.parse(constantSpeedGeodesicTravelDuration(JSON.stringify({
      points: [{ ...points[0], latitude: 'bad' }, points[1]],
      segment: segments[0],
      speedKilometersPerHour: 10,
    })))).toEqual({ valid: false, error: 'Point A has invalid coordinates.' });
    expect(JSON.parse(constantSpeedGeodesicTravelDuration(JSON.stringify({
      points: [{ pointId: 'A' }, { pointId: 'B', latitude: 0, longitude: 0 }],
      segment: { startPointId: 'A', endPointId: 'B' },
      speedKilometersPerHour: 10,
    })))).toEqual({ valid: false, error: 'Valid coordinates are required.' });
    expect(JSON.parse(constantSpeedGeodesicTravelDuration(JSON.stringify({
      points,
      segment: { startPointId: 'missing', endPointId: 'B' },
      speedKilometersPerHour: 10,
    })))).toEqual({
      valid: false,
      error: 'Valid segment points and positive speed are required.',
    });
    expect(JSON.parse(constantSpeedGeodesicTravelDuration(JSON.stringify({
      points,
      segment: {},
      speedKilometersPerHour: 10,
    })))).toEqual({
      valid: false,
      error: 'Valid segment points and positive speed are required.',
    });
    expect(JSON.parse(constantSpeedGeodesicTravelDuration(JSON.stringify({
      points,
      segment: segments[0],
      speedKilometersPerHour: -1,
    })))).toEqual({
      valid: false,
      error: 'Valid segment points and positive speed are required.',
    });
  });
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
  test('FULF outbound rejects each missing required proposal field', () => {
    const valid = {
      possessionStartPoint: { pointId: 'B', timestamp: '2026-01-01T01:00:00Z' },
      origin: { latitude: 0, longitude: 0 },
      travelDurationSeconds: 60,
      startPointId: 'A',
      segmentId: 'AB',
    };
    for (const key of [
      'possessionStartPoint', 'origin', 'travelDurationSeconds',
      'startPointId', 'segmentId',
    ]) {
      const value = { ...valid };
      delete value[key];
      expect(JSON.parse(deliveryOutboundSegmentProposal(JSON.stringify(value)))).toEqual({
        valid: false,
        error: 'Valid possession point, origin, duration, and IDs are required.',
      });
    }
    expect(JSON.parse(deliveryOutboundSegmentProposal(JSON.stringify({
      ...valid,
      travelDurationSeconds: -1,
    }))).error).toBe('Valid possession point, origin, duration, and IDs are required.');
    for (const end of [{ timestamp: valid.possessionStartPoint.timestamp },
      { pointId: 'B' }]) {
      expect(JSON.parse(deliveryOutboundSegmentProposal(JSON.stringify({
        ...valid,
        possessionStartPoint: end,
      }))).valid).toBe(false);
    }
    expect(JSON.parse(deliveryOutboundSegmentProposal(JSON.stringify({
      ...valid,
      origin: { latitude: 'not-a-coordinate', longitude: 0 },
    })))).toEqual({
      valid: false,
      error: 'Valid origin coordinates and timestamp are required.',
    });
  });
  test('FULF outbound preserves exact quantized point and segment output', () => {
    expect(
      JSON.parse(
        deliveryOutboundSegmentProposal(
          JSON.stringify({
            possessionStartPoint: points[1],
            origin: { latitude: 12.3456789, longitude: -45.6789123 },
            travelDurationSeconds: 61,
            startPointId: 'ORIGIN',
            segmentId: 'OUTBOUND',
          })
        )
      )
    ).toEqual({
      point: {
        pointId: 'ORIGIN',
        latitude: '12.345679',
        longitude: '-45.678912',
        timestamp: '2026-01-01T00:58:00.000Z',
      },
      segment: {
        segmentId: 'OUTBOUND',
        startPointId: 'ORIGIN',
        endPointId: 'B',
      },
    });
    expect(
      JSON.parse(
        deliveryOutboundSegmentProposal(
          JSON.stringify({
            possessionStartPoint: points[1],
            origin: { latitude: 0, longitude: 0 },
            travelDurationSeconds: 0,
            startPointId: 'ORIGIN',
            segmentId: 'ZERO',
          })
        )
      ).segment.segmentId
    ).toBe('ZERO');
  });
  test('FULF pickup preserves exact quantized point and segment output', () => {
    expect(
      JSON.parse(
        pickupReturnSegmentProposal(
          JSON.stringify({
            possessionEndPoint: points[1],
            destination: { latitude: 12.3456789, longitude: -45.6789123 },
            travelDurationSeconds: 61,
            endPointId: 'DESTINATION',
            segmentId: 'RETURN',
          })
        )
      )
    ).toEqual({
      point: {
        pointId: 'DESTINATION',
        latitude: '12.345679',
        longitude: '-45.678912',
        timestamp: '2026-01-01T01:02:00.000Z',
      },
      segment: {
        segmentId: 'RETURN',
        startPointId: 'B',
        endPointId: 'DESTINATION',
      },
    });
    expect(
      JSON.parse(
        pickupReturnSegmentProposal(
          JSON.stringify({
            possessionEndPoint: points[1],
            destination: { latitude: 0, longitude: 0 },
            travelDurationSeconds: 0,
            endPointId: 'DESTINATION',
            segmentId: 'ZERO-RETURN',
          })
        )
      ).segment.segmentId
    ).toBe('ZERO-RETURN');
  });
  test('FULF pickup rejects each missing required proposal field', () => {
    const valid = {
      possessionEndPoint: { pointId: 'B', timestamp: '2026-01-01T01:00:00Z' },
      destination: { latitude: 0, longitude: 0 },
      travelDurationSeconds: 60,
      endPointId: 'D',
      segmentId: 'RET',
    };
    for (const key of [
      'possessionEndPoint', 'destination', 'travelDurationSeconds',
      'endPointId', 'segmentId',
    ]) {
      const value = { ...valid };
      delete value[key];
      expect(JSON.parse(pickupReturnSegmentProposal(JSON.stringify(value)))).toEqual({
        valid: false,
        error: 'Valid possession point, destination, duration, and IDs are required.',
      });
    }
    expect(JSON.parse(pickupReturnSegmentProposal(JSON.stringify({
      ...valid,
      travelDurationSeconds: -1,
    }))).error).toBe('Valid possession point, destination, duration, and IDs are required.');
    expect(JSON.parse(pickupReturnSegmentProposal(JSON.stringify({
      ...valid,
      destination: { latitude: 'not-a-coordinate', longitude: 0 },
    }))).error).toBe('Valid destination coordinates and timestamp are required.');
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
  test('POSS2 requires all context identity fields', () => {
    for (const context of [
      { sku: 'S', segmentId: 'X' },
      { possessionContextId: 'A', segmentId: 'X' },
      { possessionContextId: 'A', sku: 'S' },
      null,
      [],
    ]) {
      expect(
        JSON.parse(possessionContextRegistry(JSON.stringify({ possessionContexts: [context] })))
          .possessionContexts
      ).toEqual([]);
    }
  });
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

  test('returns deterministic failures for malformed primitive inputs', () => {
    expect(spacetimeWorldLinePairPredicate('{')).toContain('valid');
    for (const value of [
      '{}',
      JSON.stringify({ points: [], segments: null }),
      JSON.stringify({ points: null, segments: [] }),
    ]) {
      expect(spacetimeWorldLinePairPredicate(value)).toContain(
        'Points and segments are required.'
      );
    }
    expect(
      wgs84CirclePointPredicate(
        JSON.stringify({ circle: { radiusMeters: -1 } })
      )
    ).toBe('false');
    expect(
      wgs84CircleSegmentPredicate(JSON.stringify({ points, segment: {} }))
    ).toBe('false');
    expect(
      wgs84CircleSegmentPredicate(JSON.stringify({
        points,
        segment: { startPointId: 'missing', endPointId: points[0].pointId },
      }))
    ).toBe('false');
    expect(
      wgs84CircleSegmentPredicate(JSON.stringify({
        points,
        segment: { startPointId: points[0].pointId, endPointId: 'missing' },
      }))
    ).toBe('false');
    expect(
      JSON.parse(
        constantSpeedGeodesicTravelDuration(
          JSON.stringify({
            points,
            segment: segments[0],
            speedKilometersPerHour: 0,
          })
        )
      ).valid
    ).toBe(false);
    expect(JSON.parse(deliveryOutboundSegmentProposal('{}')).valid).toBe(false);
    expect(JSON.parse(pickupReturnSegmentProposal('{}')).valid).toBe(false);
    expect(
      JSON.parse(
        possessionContextRegistry(JSON.stringify({ possessionContexts: [{}] }))
      ).possessionContexts
    ).toEqual([]);
    expect(
      assetPossessionSegmentCandidateFilter(
        JSON.stringify({ possessionSegmentId: 'missing' })
      )
    ).toBe('[]');
  });

  test('covers alternate assignment fields and world-line boundaries', () => {
    expect(
      spacetimeWorldLinePairPredicate(
        JSON.stringify({
          points,
          segments,
          firstSegmentId: 'BC',
          secondSegmentId: 'AB',
        })
      )
    ).toBe('true');
    expect(
      spacetimeWorldLinePairPredicate(
        JSON.stringify({
          points,
          segments: [{ segmentId: 'bad', startPointId: 'A', endPointId: 'A' }],
          firstSegmentId: 'bad',
          secondSegmentId: 'AB',
        })
      )
    ).toContain('Unknown segment');
    expect(
      assetPossessionSegmentCandidateFilter(
        JSON.stringify({
          assets: [
            { assetId: 'A1', sku: 'S' },
            null,
            { assetId: '', sku: 'S' },
          ],
          points,
          segments,
          assetAssignments: [{ assetId: 'A1', segmentId: 'AB' }],
          requestedSku: ' S ',
          possessionSegmentId: 'BC',
        })
      )
    ).toBe('["A1"]');
    expect(spacetimeWorldLinePairPredicate(JSON.stringify({
      points: [
        { pointId: 'A', timestamp: '2026-01-01T01:00:00Z' },
        { pointId: 'B', timestamp: '2026-01-01T00:00:00Z' },
        { pointId: 'C', timestamp: '2026-01-01T00:00:00Z' },
        { pointId: 'D', timestamp: '2026-01-01T01:00:00Z' },
      ],
      segments: [
        { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
        { segmentId: 'CD', startPointId: 'C', endPointId: 'D' },
      ],
      firstSegmentId: 'AB',
      secondSegmentId: 'CD',
    }))).toContain('ordered valid UTC interval');
    expect(spacetimeWorldLinePairPredicate(JSON.stringify({
      points: [
        { pointId: 'A', timestamp: 'not-a-date' },
        { pointId: 'B', timestamp: '2026-01-01T00:00:00Z' },
      ],
      segments: [{ segmentId: 'AB', startPointId: 'A', endPointId: 'B' }],
      firstSegmentId: 'AB',
      secondSegmentId: 'AB',
    }))).toContain('ordered valid UTC interval');
  });
  test('world-line touching requires matching endpoint identity in either order', () => {
    const worldPoints = [
      { pointId: 'A', timestamp: '2026-01-01T00:00:00Z' },
      { pointId: 'B', timestamp: '2026-01-01T01:00:00Z' },
      { pointId: 'C', timestamp: '2026-01-01T01:00:00Z' },
      { pointId: 'D', timestamp: '2026-01-01T02:00:00Z' },
    ];
    const worldSegments = [
      { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
      { segmentId: 'CD', startPointId: 'C', endPointId: 'D' },
    ];
    const value = { points: worldPoints, segments: worldSegments };
    expect(spacetimeWorldLinePairPredicate(JSON.stringify({
      ...value, firstSegmentId: 'AB', secondSegmentId: 'CD',
    }))).toBe('false');
    expect(spacetimeWorldLinePairPredicate(JSON.stringify({
      ...value, firstSegmentId: 'CD', secondSegmentId: 'AB',
    }))).toBe('false');
  });
  test('keeps touching possession intervals available and deduplicates IDs', () => {
    expect(
      JSON.parse(
        assetPossessionSegmentCandidateFilter(
          JSON.stringify({
            points,
            segments,
            possessionSegmentId: 'AB',
            requestedSku: 7,
            assets: [
              { assetId: 'A2', sku: 7 },
              { assetId: 'A2', sku: 7 },
              { assetId: 'A1', sku: 7 },
            ],
            existingAssetAssignments: [{ assetId: 'A1', segmentId: 'BC' }],
          })
        )
      )
    ).toEqual(['A1', 'A2']);
  });
});
/* eslint max-lines-per-function: off */
