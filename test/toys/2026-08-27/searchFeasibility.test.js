import { describe, expect, test } from '@jest/globals';
import { exactRequestTextToSkuLookup } from '../../../src/core/browser/toys/2026-08-27/exactRequestTextToSkuLookup.js';
import { segmentContainedWithinWindowPredicate } from '../../../src/core/browser/toys/2026-08-27/segmentContainedWithinWindowPredicate.js';
import { latestFixedDurationSegmentWithinBounds } from '../../../src/core/browser/toys/2026-08-27/latestFixedDurationSegmentWithinBounds.js';
import { deliveryOutboundRunnerFeasibility } from '../../../src/core/browser/toys/2026-08-27/deliveryOutboundRunnerFeasibility.js';
import { procurementSegmentFeasibility } from '../../../src/core/browser/toys/2026-08-27/procurementSegmentFeasibility.js';
import { pickupReturnRunnerFeasibility } from '../../../src/core/browser/toys/2026-08-27/pickupReturnRunnerFeasibility.js';
import { procurementBackedFulfillmentFeasibilityComposition } from '../../../src/core/browser/toys/2026-08-27/procurementBackedFulfillmentFeasibilityComposition.js';
import { searchRequestToSkuResultWrapper } from '../../../src/core/browser/toys/2026-08-27/searchRequestToSkuResultWrapper.js';

const schedule = [
  { startTimestamp: '2026-08-27T15:00Z', endTimestamp: '2026-08-27T21:00Z' },
];
const base = {
  requestText: 'football',
  deliveryPoint: { timestamp: '2026-08-27T19:00Z' },
  pickupPoint: { timestamp: '2026-08-27T20:00Z' },
  durations: {
    deliveryOutboundSeconds: 2700,
    procurementSeconds: 1800,
    pickupReturnSeconds: 2700,
  },
  supplierAvailability: {
    startTimestamp: '2026-08-27T07:00Z',
    endTimestamp: '2026-08-27T17:00Z',
  },
  runnerSchedule: schedule,
  runnerCommitments: [],
  nowTimestamp: '2026-08-27T15:00Z',
};

const json = (fn, input) => JSON.parse(fn(JSON.stringify(input)));

describe('EXAC1 exact request text to SKU lookup', () => {
  test('matches only football exactly', () => {
    expect(
      json(exactRequestTextToSkuLookup, { requestText: 'football' })
    ).toEqual({ matched: true, skuId: 'FOOTBALL' });
    expect(
      json(exactRequestTextToSkuLookup, { requestText: 'Football' })
    ).toEqual({ matched: false, skuId: null });
  });
});

describe('SEGM3 and LATE2 temporal primitives', () => {
  test('contains inclusive boundaries and places latest fixed duration', () => {
    expect(
      json(segmentContainedWithinWindowPredicate, {
        segmentStartTimestamp: '2026-08-27T10:00Z',
        segmentEndTimestamp: '2026-08-27T11:00Z',
        windowStartTimestamp: '2026-08-27T10:00Z',
        windowEndTimestamp: '2026-08-27T11:00Z',
      })
    ).toEqual({ feasible: true });
    expect(
      json(latestFixedDurationSegmentWithinBounds, {
        durationSeconds: 1800,
        earliestStartTimestamp: '2026-08-27T10:00Z',
        latestEndTimestamp: '2026-08-27T11:00Z',
      })
    ).toMatchObject({
      feasible: true,
      startTimestamp: '2026-08-27T10:30:00.000Z',
      endTimestamp: '2026-08-27T11:00:00.000Z',
    });
  });
});

describe('DELI2, PROC3, and PICK2 runner feasibility', () => {
  test('constructs delivery, procurement, and pickup candidates', () => {
    expect(
      json(deliveryOutboundRunnerFeasibility, {
        ...base,
        deliveryDurationSeconds: 2700,
      })
    ).toMatchObject({
      feasible: true,
      startTimestamp: '2026-08-27T18:15:00.000Z',
    });
    expect(
      json(procurementSegmentFeasibility, {
        procurementDurationSeconds: 1800,
        nowTimestamp: base.nowTimestamp,
        deliveryOutboundStartTimestamp: '2026-08-27T18:15Z',
        supplierAvailability: base.supplierAvailability,
        runnerSchedule: schedule,
        runnerCommitments: [],
      })
    ).toMatchObject({
      feasible: true,
      startTimestamp: '2026-08-27T16:30:00.000Z',
    });
    expect(
      json(pickupReturnRunnerFeasibility, {
        pickupPoint: base.pickupPoint,
        pickupDurationSeconds: 2700,
        runnerSchedule: schedule,
        runnerCommitments: [],
      })
    ).toMatchObject({
      feasible: true,
      endTimestamp: '2026-08-27T20:45:00.000Z',
    });
  });

  test('rejects a commitment overlap', () => {
    expect(
      json(pickupReturnRunnerFeasibility, {
        pickupPoint: base.pickupPoint,
        pickupDurationSeconds: 2700,
        runnerSchedule: schedule,
        runnerCommitments: [
          {
            startTimestamp: '2026-08-27T20:15Z',
            endTimestamp: '2026-08-27T20:30Z',
          },
        ],
      })
    ).toMatchObject({ feasible: false, reason: 'runner-commitment-overlap' });
  });
});

describe('PROC3 composition and OBJE2 search wrapper', () => {
  test('runs the three serial blocking guards and returns one SKU', () => {
    expect(
      json(procurementBackedFulfillmentFeasibilityComposition, base)
    ).toMatchObject({ feasible: true });
    expect(json(searchRequestToSkuResultWrapper, base)).toEqual({
      valid: true,
      results: [{ skuId: 'FOOTBALL' }],
    });
  });

  test('returns an empty result for unsupported text or an unavailable runner', () => {
    expect(
      json(searchRequestToSkuResultWrapper, { ...base, requestText: 'rugby' })
    ).toEqual({ valid: true, results: [] });
    expect(
      json(searchRequestToSkuResultWrapper, {
        ...base,
        runnerCommitments: [
          {
            startTimestamp: '2026-08-27T18:00Z',
            endTimestamp: '2026-08-27T18:30Z',
          },
        ],
      })
    ).toEqual({ valid: true, results: [] });
  });
});
