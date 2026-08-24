import { describe, expect, it } from '@jest/globals';
import { procurementPrefixProposal } from '../../../src/core/browser/toys/2026-08-22/procurementPrefixProposal.js';

const valid = {
  deliveryOutboundStartPoint: {
    pointId: 'delivery',
    spacePointId: 'warehouse',
    timestamp: '2026-08-24T12:00:00Z',
  },
  warehouse: {
    spacePointId: 'warehouse',
    latitude: 52,
    longitude: 13,
  },
  procurementDurationSeconds: 60,
  procurementBufferSeconds: 60,
  generatedIds: {
    procurementStartPointId: 'procurement-start',
    procurementSegmentId: 'procurement-segment',
  },
};

/**
 *
 * @param overrides
 */
/**
 * Run the proposal with a partial request override.
 * @param {Record<string, unknown>} overrides Request fields to replace.
 * @returns {Record<string, unknown>} Parsed proposal result.
 */
function result(overrides) {
  return JSON.parse(
    procurementPrefixProposal(JSON.stringify({ ...valid, ...overrides }))
  );
}

describe('procurementPrefixProposal validation branches', () => {
  it.each([
    [{ deliveryOutboundStartPoint: null }, 'delivery-outbound start point'],
    [
      {
        deliveryOutboundStartPoint: {
          ...valid.deliveryOutboundStartPoint,
          pointId: '',
        },
      },
      'delivery-outbound point ID',
    ],
    [
      {
        deliveryOutboundStartPoint: {
          ...valid.deliveryOutboundStartPoint,
          spacePointId: '',
        },
      },
      'delivery-outbound space point ID',
    ],
    [{ warehouse: null }, 'warehouse'],
    [{ warehouse: { spacePointId: '' } }, 'warehouse space point ID'],
    [{ warehouse: { ...valid.warehouse, latitude: 91 } }, 'latitude'],
    [{ warehouse: { ...valid.warehouse, longitude: -181 } }, 'longitude'],
    [
      {
        deliveryOutboundStartPoint: {
          ...valid.deliveryOutboundStartPoint,
          timestamp: 'invalid',
        },
      },
      'start timestamp',
    ],
    [{ procurementDurationSeconds: -1 }, 'duration'],
    [{ procurementBufferSeconds: Number.POSITIVE_INFINITY }, 'buffer'],
    [
      { generatedIds: { ...valid.generatedIds, procurementStartPointId: '' } },
      'start ID',
    ],
    [
      { generatedIds: { ...valid.generatedIds, procurementSegmentId: '' } },
      'segment ID',
    ],
    [
      {
        generatedIds: {
          procurementStartPointId: 'delivery',
          procurementSegmentId: 'segment',
        },
      },
      'duplicate IDs',
    ],
    [
      { procurementDurationSeconds: 30, procurementBufferSeconds: 0 },
      'unaligned result',
    ],
  ])('rejects invalid %s', (overrides, label) => {
    expect(result(overrides)).toMatchObject({ valid: false });
    expect(result(overrides).error).toEqual(expect.any(String));
    expect(label).toEqual(expect.any(String));
  });

  it('accepts string coordinates and zero durations', () => {
    expect(
      result({
        warehouse: { ...valid.warehouse, latitude: '52', longitude: '13' },
        procurementDurationSeconds: 0,
        procurementBufferSeconds: 0,
      })
    ).toMatchObject({ valid: true });
  });
});
