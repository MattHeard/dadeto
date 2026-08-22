import { describe, expect, test } from '@jest/globals';
import { normalFulfillmentSequenceProposal } from '../../../src/core/browser/toys/2026-08-22/normalFulfillmentSequenceProposal.js';

const request = {
  possessionContext: {
    segment: { segmentId: 'POS', startPointId: 'P1', endPointId: 'P2' },
    startPoint: {
      pointId: 'P1',
      spacePointId: 'CUSTOMER',
      timestamp: '2026-08-23T12:00Z',
    },
    endPoint: {
      pointId: 'P2',
      spacePointId: 'CUSTOMER',
      timestamp: '2026-08-23T14:00Z',
    },
  },
  warehouse: {
    spacePointId: 'WAREHOUSE',
    latitude: 52.123456,
    longitude: 13.123456,
  },
  travelDurations: {
    deliveryOutboundSeconds: 1800,
    deliveryReturnSeconds: 1800,
    pickupOutboundSeconds: 1800,
    pickupReturnSeconds: 1800,
  },
  configuration: {
    deliveryOutboundBufferSeconds: 900,
    deliveryReturnBufferSeconds: 900,
    pickupOutboundBufferSeconds: 900,
    pickupReturnBufferSeconds: 900,
    inspectionDurationSeconds: 600,
    inspectionBufferSeconds: 300,
    cleaningDurationSeconds: 3600,
    cleaningBufferSeconds: 900,
  },
  generatedIds: {
    points: {
      deliveryOutboundStart: 'P0',
      deliveryReturnEnd: 'P3',
      pickupOutboundStart: 'P4',
      pickupReturnEnd: 'P5',
      inspectionComplete: 'P6',
      cleaningComplete: 'P7',
    },
    segments: {
      deliveryOutbound: 'S0',
      deliveryReturn: 'S1',
      pickupOutbound: 'S3',
      pickupReturn: 'S4',
      inspection: 'S5',
      cleaning: 'S6',
    },
  },
};

describe('NORM1 normal fulfillment sequence proposal', () => {
  test('constructs seven operations and preserves possession data', () => {
    const result = JSON.parse(
      normalFulfillmentSequenceProposal(JSON.stringify(request))
    );
    expect(result.valid).toBe(true);
    expect(result.sequence).toHaveLength(7);
    expect(result.sequence.map(operation => operation.operation)).toEqual([
      'delivery-outbound',
      'delivery-return',
      'possession',
      'pickup-outbound',
      'pickup-return',
      'inspection',
      'cleaning',
    ]);
    expect(result.segments[2]).toEqual(request.possessionContext.segment);
    expect(result.points.slice(-2)).toEqual([
      request.possessionContext.startPoint,
      request.possessionContext.endPoint,
    ]);
    expect(result.spacePoints).toEqual([
      { spacePointId: 'WAREHOUSE', latitude: '52.123456', longitude: '13.123456' },
    ]);
  });

  test('shares exact point identities and calculates timing', () => {
    const result = JSON.parse(
      normalFulfillmentSequenceProposal(JSON.stringify(request))
    );
    const [
      delivery,
      deliveryReturn,
      ,
      pickup,
      pickupReturn,
      inspection,
      cleaning,
    ] = result.segments;
    expect(delivery.endPointId).toBe('P1');
    expect(deliveryReturn.startPointId).toBe('P1');
    expect(pickup.endPointId).toBe('P2');
    expect(pickupReturn.startPointId).toBe('P2');
    expect(pickupReturn.endPointId).toBe(inspection.startPointId);
    expect(inspection.endPointId).toBe(cleaning.startPointId);
    expect(result.points[0].timestamp).toBe('2026-08-23T11:15Z');
    expect(result.points[1].timestamp).toBe('2026-08-23T12:45Z');
    expect(result.points[2].timestamp).toBe('2026-08-23T13:15Z');
    expect(result.points[5].timestamp).toBe('2026-08-23T16:15Z');
    expect(result.sequence[0]).toMatchObject({
      requiresAsset: true,
      requiresRunner: true,
      runnerCustody: true,
      baseDurationSeconds: 1800,
      bufferSeconds: 900,
      allocatedDurationSeconds: 2700,
    });
    expect(result.sequence[1]).toMatchObject({
      requiresAsset: false,
      requiresRunner: true,
      runnerCustody: false,
    });
  });

  test('accepts zero processing durations and does not mutate input', () => {
    const original = JSON.stringify(request);
    const result = JSON.parse(
      normalFulfillmentSequenceProposal(
        JSON.stringify({
          ...request,
          configuration: {
            ...request.configuration,
            inspectionDurationSeconds: 0,
            inspectionBufferSeconds: 0,
            cleaningDurationSeconds: 0,
            cleaningBufferSeconds: 0,
          },
        })
      )
    );
    expect(result.valid).toBe(true);
    expect(JSON.stringify(request)).toBe(original);
  });

  test.each([
    ['missing context', { possessionContext: {} }],
    [
      'legacy possession point',
      {
        possessionContext: {
          ...request.possessionContext,
          startPoint: {
            ...request.possessionContext.startPoint,
            latitude: 1,
            longitude: 2,
            spacePointId: undefined,
          },
        },
      },
    ],
    [
      'invalid warehouse',
      { warehouse: { ...request.warehouse, longitude: 181 } },
    ],
    [
      'missing duration',
      {
        travelDurations: {
          ...request.travelDurations,
          pickupReturnSeconds: undefined,
        },
      },
    ],
    [
      'negative duration',
      {
        configuration: { ...request.configuration, cleaningBufferSeconds: -1 },
      },
    ],
    [
      'non-finite duration',
      {
        configuration: {
          ...request.configuration,
          inspectionDurationSeconds: null,
        },
      },
    ],
    [
      'missing ID',
      {
        generatedIds: {
          ...request.generatedIds,
          points: { ...request.generatedIds.points, cleaningComplete: '' },
        },
      },
    ],
    [
      'duplicate ID',
      {
        generatedIds: {
          ...request.generatedIds,
          segments: { ...request.generatedIds.segments, cleaning: 'S5' },
        },
      },
    ],
  ])('%s returns structured invalid output', (_, change) => {
    const result = JSON.parse(
      normalFulfillmentSequenceProposal(
        JSON.stringify({ ...request, ...change })
      )
    );
    expect(result).toMatchObject({ valid: false });
  });
});
