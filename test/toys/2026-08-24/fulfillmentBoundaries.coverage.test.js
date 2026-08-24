import { describe, expect, test } from '@jest/globals';
import {
  fulfillmentBoundary,
  fulfillmentFailure,
  fulfillmentFindMatchingAsset,
  fulfillmentFiniteNonNegative,
  fulfillmentMergeById,
  fulfillmentMinuteAligned,
  fulfillmentNonblank,
  fulfillmentResolvePoint,
  fulfillmentExistingAssetBoundary,
} from '../../../src/core/browser/toys/2026-08-22/fulfillmentResult.js';
import {
  evaluateWorldLineMany,
  resolveSegment,
  resolveSegmentTiming,
} from '../../../src/core/browser/toys/2026-08-21/segmentAssignmentFeasibilityCore.js';
import { canonicalNormalFulfillmentSequenceProposal } from '../../../src/core/browser/toys/2026-08-22/canonicalNormalFulfillmentSequenceProposal.js';
import { procurementNormalFulfillmentComposer } from '../../../src/core/browser/toys/2026-08-22/procurementNormalFulfillmentComposer.js';
import { procurementPrefixProposal } from '../../../src/core/browser/toys/2026-08-22/procurementPrefixProposal.js';
import { existingAssetFulfillmentFeasibility } from '../../../src/core/browser/toys/2026-08-23/existingAssetFulfillmentFeasibility.js';
import { existingAssetFulfillmentSequenceFeasibility } from '../../../src/core/browser/toys/2026-08-23/existingAssetFulfillmentSequenceFeasibility.js';

describe('fulfillment boundary helpers', () => {
  test('covers scalar predicates and failure serialization', () => {
    expect(fulfillmentNonblank(undefined)).toBe(false);
    expect(fulfillmentNonblank('  ')).toBe(false);
    expect(fulfillmentNonblank('x')).toBe(true);
    expect(fulfillmentFiniteNonNegative(-1)).toBe(false);
    expect(fulfillmentFiniteNonNegative(0)).toBe(true);
    expect(fulfillmentFiniteNonNegative('1')).toBe(false);
    expect(fulfillmentMinuteAligned(0)).toBe(true);
    expect(fulfillmentMinuteAligned(1)).toBe(false);
    expect(JSON.parse(fulfillmentFailure('bad'))).toMatchObject({
      valid: false,
    });
    expect(
      JSON.parse(fulfillmentFailure(new Error('bad'), 'feasible'))
    ).toMatchObject({ feasible: false });
  });

  test('covers matching, merge, point, and boundary failures', () => {
    expect(
      fulfillmentFindMatchingAsset(
        { requestedSku: 'x', assets: [] },
        () => '{"feasible":false}'
      )
    ).toBe('{"feasible":false}');
    expect(() => fulfillmentFindMatchingAsset({}, () => '{}')).toThrow();
    expect(fulfillmentMergeById([{ id: 'a' }, { id: 'a' }], 'id')).toEqual([
      { id: 'a' },
    ]);
    expect(() => fulfillmentMergeById([{}], 'id')).toThrow();
    expect(() =>
      fulfillmentMergeById(
        [
          { id: 'a', value: 1 },
          { id: 'a', value: 2 },
        ],
        'id'
      )
    ).toThrow();
    expect(
      fulfillmentResolvePoint({ spacePointId: 's' }, [
        { spacePointId: 's', latitude: 1, longitude: 2 },
      ])
    ).toMatchObject({ latitude: 1 });
    expect(() =>
      fulfillmentResolvePoint({ spacePointId: 'missing' }, [])
    ).toThrow();
    expect(
      JSON.parse(fulfillmentBoundary('{bad}', 'valid', () => '{}'))
    ).toMatchObject({ valid: false });
  });
});

describe('segment timing and world-line boundaries', () => {
  const points = new Map([
    ['a', { pointId: 'a', timestamp: '2026-08-24T10:00:00Z' }],
    ['b', { pointId: 'b', timestamp: '2026-08-24T11:00:00Z' }],
  ]);
  const segments = new Map([
    ['s', { segmentId: 's', startPointId: 'a', endPointId: 'b' }],
  ]);

  test('resolves valid timing and rejects malformed references', () => {
    expect(resolveSegmentTiming(segments, points, 's')).toMatchObject({
      startPointId: 'a',
    });
    expect(resolveSegment(segments, points, 's')).toMatchObject({
      segmentId: 's',
    });
    expect(() => resolveSegmentTiming(segments, points, 'missing')).toThrow();
    expect(() => resolveSegmentTiming(segments, new Map(), 's')).toThrow();
    expect(() =>
      resolveSegmentTiming(
        new Map([['s', { startPointId: 'a', endPointId: 'b' }]]),
        new Map([
          ['a', { pointId: 'a', timestamp: 'invalid' }],
          ['b', { pointId: 'b', timestamp: '2026-08-24T11:00:00Z' }],
        ]),
        's'
      )
    ).toThrow();
  });

  test('returns structured failures for empty and invalid candidates', () => {
    const entry = { pointId: 'a', timestamp: '2026-08-24T10:00:00Z' };
    expect(evaluateWorldLineMany([], [], [], entry)).toMatchObject({
      reason: 'missing-candidate-segments',
    });
    expect(
      evaluateWorldLineMany([], [], [{ segmentId: '' }], entry)
    ).toMatchObject({ reason: 'invalid-candidate-segment' });
    expect(
      evaluateWorldLineMany(
        [],
        [],
        [{ segmentId: 's' }, { segmentId: 's' }],
        entry
      )
    ).toMatchObject({ reason: 'duplicate-candidate-segment' });
    expect(
      evaluateWorldLineMany(
        [],
        [{ segmentId: 's' }],
        [{ segmentId: 's' }],
        entry
      )
    ).toMatchObject({ reason: 'duplicate-segment' });
    expect(evaluateWorldLineMany(null, null, null, entry)).toMatchObject({
      reason: 'missing-candidate-segments',
    });
    expect(
      evaluateWorldLineMany([], [], [{ segmentId: 's' }], {})
    ).toMatchObject({ reason: 'missing-entry-point' });
  });
});

describe('fulfillment toy validation boundaries', () => {
  test('serializes invalid requests without suppressing validation branches', () => {
    for (const calculate of [
      canonicalNormalFulfillmentSequenceProposal,
      procurementNormalFulfillmentComposer,
      procurementPrefixProposal,
    ])
      expect(JSON.parse(calculate('{}'))).toMatchObject({ valid: false });
    for (const calculate of [
      existingAssetFulfillmentFeasibility,
      existingAssetFulfillmentSequenceFeasibility,
    ])
      expect(JSON.parse(calculate('{}'))).toMatchObject({ feasible: false });
  });

  test('covers canonical spatial and procurement timestamp failures', () => {
    expect(
      JSON.parse(
        canonicalNormalFulfillmentSequenceProposal('{"spacePoints":[]}')
      )
    ).toMatchObject({ valid: false });
    expect(
      JSON.parse(
        canonicalNormalFulfillmentSequenceProposal(
          JSON.stringify({
            spacePoints: [],
            warehouse: {
              spacePointId: 'warehouse',
              latitude: 52,
              longitude: 13,
            },
            deliveryOutboundStartPoint: {
              pointId: 'delivery',
              spacePointId: 'warehouse',
              timestamp: '2026-08-24T10:00:00.000Z',
            },
          })
        )
      )
    ).toMatchObject({ valid: false });
    expect(
      JSON.parse(
        canonicalNormalFulfillmentSequenceProposal(
          JSON.stringify({ spacePoints: [{}] })
        )
      )
    ).toMatchObject({ valid: false });
    expect(
      JSON.parse(
        procurementPrefixProposal(
          JSON.stringify({
            deliveryOutboundStartPoint: {
              pointId: 'delivery',
              spacePointId: 'warehouse',
              timestamp: 'invalid',
            },
            warehouse: {
              spacePointId: 'warehouse',
              latitude: 52,
              longitude: 13,
            },
            procurementDurationSeconds: 0,
            procurementBufferSeconds: 0,
            generatedIds: {
              procurementStartPointId: 'start',
              procurementSegmentId: 'segment',
            },
          })
        )
      )
    ).toMatchObject({ valid: false });
  });

  test('covers existing-asset request fallback and required-field failures', () => {
    const select = () => [];
    const evaluate = () => ({ feasible: true });
    expect(
      JSON.parse(fulfillmentExistingAssetBoundary('{}', select, evaluate))
    ).toMatchObject({ feasible: false });
    expect(
      JSON.parse(
        fulfillmentExistingAssetBoundary(
          JSON.stringify({ asset: { assetId: 'a' }, proposal: {} }),
          select,
          evaluate
        )
      )
    ).toMatchObject({ feasible: false });
    expect(
      JSON.parse(
        fulfillmentExistingAssetBoundary(
          JSON.stringify({
            asset: {
              assetId: 'a',
              stockInPoint: { pointId: 'stock', spacePointId: 'warehouse' },
            },
            proposal: { points: [], spacePoints: [] },
          }),
          select,
          evaluate
        )
      )
    ).toMatchObject({ feasible: false });
    expect(
      JSON.parse(
        procurementNormalFulfillmentComposer(
          JSON.stringify({ procurementProposal: {}, normalProposal: {} })
        )
      )
    ).toMatchObject({ valid: false });
    const base = {
      asset: {
        assetId: 'a',
        stockInPoint: { pointId: 'stock', spacePointId: 'warehouse' },
      },
      points: [],
      spacePoints: [],
    };
    expect(
      JSON.parse(
        existingAssetFulfillmentFeasibility(
          JSON.stringify({ ...base, proposal: { valid: true } })
        )
      )
    ).toMatchObject({ feasible: false });
    expect(
      JSON.parse(
        existingAssetFulfillmentSequenceFeasibility(
          JSON.stringify({ ...base, proposal: { valid: true, sequence: [] } })
        )
      )
    ).toMatchObject({ feasible: false });
    expect(
      JSON.parse(
        existingAssetFulfillmentSequenceFeasibility(
          JSON.stringify({
            ...base,
            proposal: { valid: true, sequence: [], segments: [] },
          })
        )
      )
    ).toMatchObject({ feasible: false });
  });
});
