import { describe, expect, test } from '@jest/globals';
import { canonicalNormalFulfillmentSequenceProposal } from '../../../src/core/browser/toys/2026-08-22/canonicalNormalFulfillmentSequenceProposal.js';
import { procurementPrefixProposal } from '../../../src/core/browser/toys/2026-08-22/procurementPrefixProposal.js';
import { procurementNormalFulfillmentComposer } from '../../../src/core/browser/toys/2026-08-22/procurementNormalFulfillmentComposer.js';

const normalRequest = {
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
  spacePoints: [
    { spacePointId: 'CUSTOMER', latitude: '52.500000', longitude: '13.400000' },
  ],
  warehouse: {
    spacePointId: 'WAREHOUSE',
    latitude: '52.123456',
    longitude: '13.123456',
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
      deliveryOutboundStart: 'D0',
      deliveryReturnEnd: 'D1',
      pickupOutboundStart: 'D2',
      pickupReturnEnd: 'D3',
      inspectionComplete: 'D4',
      cleaningComplete: 'D5',
    },
    segments: {
      deliveryOutbound: 'S0',
      deliveryReturn: 'S1',
      pickupOutbound: 'S2',
      pickupReturn: 'S3',
      inspection: 'S4',
      cleaning: 'S5',
    },
  },
};

/**
 *
 */
function normalProposal() {
  return JSON.parse(
    canonicalNormalFulfillmentSequenceProposal(JSON.stringify(normalRequest))
  );
}

describe('canonical fulfillment composition', () => {
  test('canonical normal proposal is self-contained and deduplicates space points', () => {
    const input = {
      ...normalRequest,
      spacePoints: [
        ...normalRequest.spacePoints,
        { ...normalRequest.spacePoints[0] },
      ],
    };
    const result = JSON.parse(
      canonicalNormalFulfillmentSequenceProposal(JSON.stringify(input))
    );
    expect(result.valid).toBe(true);
    expect(result.spacePoints).toEqual([
      {
        spacePointId: 'CUSTOMER',
        latitude: '52.500000',
        longitude: '13.400000',
      },
      {
        spacePointId: 'WAREHOUSE',
        latitude: '52.123456',
        longitude: '13.123456',
      },
    ]);
    expect(
      result.points.every(point =>
        result.spacePoints.some(
          space => space.spacePointId === point.spacePointId
        )
      )
    ).toBe(true);
    expect(result.sequence).toHaveLength(7);
  });

  test('conflicting or missing possession space points reject', () => {
    expect(
      JSON.parse(
        canonicalNormalFulfillmentSequenceProposal(
          JSON.stringify({
            ...normalRequest,
            spacePoints: [
              {
                spacePointId: 'CUSTOMER',
                latitude: '52.500001',
                longitude: '13.400000',
              },
            ],
          })
        )
      ).valid
    ).toBe(true);
    expect(
      JSON.parse(
        canonicalNormalFulfillmentSequenceProposal(
          JSON.stringify({
            ...normalRequest,
            spacePoints: [],
          })
        )
      ).valid
    ).toBe(false);
    expect(
      JSON.parse(
        canonicalNormalFulfillmentSequenceProposal(
          JSON.stringify({
            ...normalRequest,
            spacePoints: [
              ...normalRequest.spacePoints,
              {
                spacePointId: 'CUSTOMER',
                latitude: '52.500001',
                longitude: '13.400000',
              },
            ],
          })
        )
      ).valid
    ).toBe(false);
  });

  test('procurement prefix reuses delivery start and calculates stock-in', () => {
    const normal = normalProposal();
    const start = normal.points.find(point => point.pointId === 'D0');
    const result = JSON.parse(
      procurementPrefixProposal(
        JSON.stringify({
          deliveryOutboundStartPoint: start,
          warehouse: normal.spacePoints.find(
            point => point.spacePointId === 'WAREHOUSE'
          ),
          procurementDurationSeconds: 1800,
          procurementBufferSeconds: 900,
          generatedIds: {
            procurementStartPointId: 'PROC0',
            procurementSegmentId: 'PROCSEG',
          },
        })
      )
    );
    expect(result.valid).toBe(true);
    expect(result.segments[0].endPointId).toBe('D0');
    expect(result.stockInPointId).toBe('D0');
    expect(result.sequence[0].allocatedDurationSeconds).toBe(2700);
  });

  test('composer prepends procurement and preserves normal objects', () => {
    const normal = normalProposal();
    const procurement = JSON.parse(
      procurementPrefixProposal(
        JSON.stringify({
          deliveryOutboundStartPoint: normal.points.find(
            point => point.pointId === 'D0'
          ),
          warehouse: normal.spacePoints.find(
            point => point.spacePointId === 'WAREHOUSE'
          ),
          procurementDurationSeconds: 1800,
          procurementBufferSeconds: 900,
          generatedIds: {
            procurementStartPointId: 'PROC0',
            procurementSegmentId: 'PROCSEG',
          },
        })
      )
    );
    const result = JSON.parse(
      procurementNormalFulfillmentComposer(
        JSON.stringify({
          procurementProposal: procurement,
          normalProposal: normal,
        })
      )
    );
    expect(result.valid).toBe(true);
    expect(result.sequence).toHaveLength(8);
    expect(result.sequence[0].operation).toBe('procurement');
    expect(result.sequence[1]).toEqual(normal.sequence[0]);
    expect(result.segments).toContainEqual(normal.segments[0]);
    expect(result.spacePoints).toHaveLength(2);
  });

  test('composer rejects a mismatched procurement boundary', () => {
    const normal = normalProposal();
    const procurement = JSON.parse(
      procurementPrefixProposal(
        JSON.stringify({
          deliveryOutboundStartPoint: {
            ...normal.points.find(point => point.pointId === 'D0'),
            pointId: 'OTHER',
          },
          warehouse: normal.spacePoints.find(
            point => point.spacePointId === 'WAREHOUSE'
          ),
          procurementDurationSeconds: 1800,
          procurementBufferSeconds: 900,
          generatedIds: {
            procurementStartPointId: 'PROC0',
            procurementSegmentId: 'PROCSEG',
          },
        })
      )
    );
    expect(
      JSON.parse(
        procurementNormalFulfillmentComposer(
          JSON.stringify({
            procurementProposal: procurement,
            normalProposal: normal,
          })
        )
      ).valid
    ).toBe(false);
  });
});
