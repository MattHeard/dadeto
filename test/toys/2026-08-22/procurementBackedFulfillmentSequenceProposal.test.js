import { describe, expect, test } from '@jest/globals';
import { procurementBackedFulfillmentSequenceProposal } from '../../../src/core/browser/toys/2026-08-22/procurementBackedFulfillmentSequenceProposal.js';

const request = {
  possessionContext: {
    segment: { segmentId: 'POS', startPointId: 'P1', endPointId: 'P2' },
    startPoint: {
      pointId: 'P1',
      latitude: 51.5,
      longitude: -0.1,
      timestamp: '2026-08-22T12:00Z',
    },
    endPoint: {
      pointId: 'P2',
      latitude: 51.51,
      longitude: -0.11,
      timestamp: '2026-08-22T14:00Z',
    },
  },
  warehouse: { latitude: 51.49, longitude: -0.09 },
  travelDurations: { deliveryOutboundSeconds: 1500, pickupReturnSeconds: 1800 },
  configuration: {
    procurementDuration: 1800,
    procurementBuffer: 900,
    deliveryBuffer: 600,
    pickupBuffer: 300,
    inspectionDuration: 600,
    inspectionBuffer: 300,
    cleaningDuration: 3600,
    cleaningBuffer: 600,
  },
  generatedIds: {
    warehouseSpacePointId: 'WH',
    points: {
      procurementStart: 'P0',
      stockReady: 'P3',
      pickupReturn: 'P4',
      inspectionComplete: 'P5',
      cleaningComplete: 'P6',
    },
    segments: {
      procurement: 'SEG0',
      deliveryOutbound: 'SEG1',
      pickupReturn: 'SEG3',
      inspection: 'SEG4',
      cleaning: 'SEG5',
    },
  },
};

describe('PROC1 procurement-backed fulfillment sequence proposal', () => {
  test('constructs a deterministic sequence with shared touching identities', () => {
    const result = JSON.parse(
      procurementBackedFulfillmentSequenceProposal(JSON.stringify(request))
    );
    expect(result.sequence.map(operation => operation.operation)).toEqual([
      'procurement',
      'delivery-outbound',
      'possession',
      'pickup-return',
      'inspection',
      'cleaning',
    ]);
    expect(result.segments.map(segment => segment.segmentId)).toEqual([
      'SEG0',
      'SEG1',
      'POS',
      'SEG3',
      'SEG4',
      'SEG5',
    ]);
    expect(result.segments[0].endPointId).toBe(result.segments[1].startPointId);
    expect(result.segments[1].endPointId).toBe('P1');
    expect(result.segments[2]).toEqual(request.possessionContext.segment);
    expect(result.segments[2].endPointId).toBe(result.segments[3].startPointId);
    expect(result.segments[3].endPointId).toBe(result.segments[4].startPointId);
    expect(result.segments[4].endPointId).toBe(result.segments[5].startPointId);
    expect(result.points[0].timestamp).toBe('2026-08-22T10:40Z');
    expect(result.points[1].timestamp).toBe('2026-08-22T11:25Z');
    expect(result.points.at(-1).timestamp).toBe('2026-08-22T16:00Z');
    expect(
      result.points.filter(point => point.spacePointId === 'WH')
    ).toHaveLength(5);
  });

  test('keeps input immutable and preserves timing metadata', () => {
    const original = JSON.stringify(request);
    const result = JSON.parse(
      procurementBackedFulfillmentSequenceProposal(JSON.stringify(request))
    );
    expect(JSON.stringify(request)).toBe(original);
    expect(result.sequence[0]).toMatchObject({
      baseDurationSeconds: 1800,
      bufferSeconds: 900,
      allocatedDurationSeconds: 2700,
    });
  });

  test.each([
    ['missing context', { possessionContext: {} }],
    [
      'mismatched endpoint references',
      {
        possessionContext: {
          ...request.possessionContext,
          segment: {
            ...request.possessionContext.segment,
            endPointId: 'OTHER',
          },
        },
      },
    ],
    [
      'invalid possession timestamps',
      {
        possessionContext: {
          ...request.possessionContext,
          endPoint: { ...request.possessionContext.endPoint, timestamp: 'bad' },
        },
      },
    ],
    ['invalid warehouse', { warehouse: { latitude: 91, longitude: 0 } }],
    ['missing travel durations', { travelDurations: undefined }],
    ['missing configuration', { configuration: undefined }],
    [
      'non-minute resulting timestamp',
      {
        travelDurations: {
          ...request.travelDurations,
          deliveryOutboundSeconds: 1,
        },
      },
    ],
    [
      'negative duration',
      { configuration: { ...request.configuration, cleaningDuration: -1 } },
    ],
    [
      'missing generated ID',
      {
        generatedIds: {
          ...request.generatedIds,
          points: { ...request.generatedIds.points, cleaningComplete: '' },
        },
      },
    ],
    [
      'duplicate generated ID',
      {
        generatedIds: {
          ...request.generatedIds,
          segments: { ...request.generatedIds.segments, cleaning: 'SEG4' },
        },
      },
    ],
    [
      'empty generated collections',
      { generatedIds: { ...request.generatedIds, points: {}, segments: {} } },
    ],
    [
      'missing generated collections',
      {
        generatedIds: {
          ...request.generatedIds,
          points: undefined,
          segments: undefined,
        },
      },
    ],
  ])('%s is rejected without a proposal', (_, change) => {
    const result = JSON.parse(
      procurementBackedFulfillmentSequenceProposal(
        JSON.stringify({ ...request, ...change })
      )
    );
    expect(result.valid).toBe(false);
  });
});
