import { describe, expect, test, jest } from '@jest/globals';
import {
  composed,
  contained,
  delivery,
  exactLookup,
  finiteDuration,
  latestPlacement,
  pickup,
  procurement,
  runnerInterval,
  searchResult,
} from '../../src/core/object-minute-rental-search/search-core.js';
import { createSearchHttpHandler } from '../../src/core/object-minute-rental-search/search-http.js';
// Reuse the established wrapper-level assertions so the direct core mutation
// run observes every externally visible feasibility branch as well.
import '../toys/2026-08-27/searchFeasibility.test.js';

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

describe('object minute rental search core', () => {
  test('covers lookup, duration, placement, and containment primitives', () => {
    expect(exactLookup({ requestText: 'football' })).toEqual({
      matched: true,
      skuId: 'FOOTBALL',
    });
    expect(exactLookup({ requestText: 'rugby' })).toEqual({
      matched: false,
      skuId: null,
    });
    expect(finiteDuration(0)).toBe(true);
    expect(finiteDuration(-1)).toBe(false);
    expect(finiteDuration('1')).toBe(false);
    expect(
      latestPlacement(1800, base.nowTimestamp, base.pickupPoint.timestamp)
    ).toMatchObject({
      feasible: true,
      startTimestamp: '2026-08-27T19:30:00.000Z',
    });
    expect(
      contained(
        ...[
          '2026-08-27T10:00Z',
          '2026-08-27T11:00Z',
          '2026-08-27T09:00Z',
          '2026-08-27T12:00Z',
        ]
      )
    ).toBe(true);
    expect(
      contained(
        'bad',
        '2026-08-27T11:00Z',
        base.nowTimestamp,
        base.pickupPoint.timestamp
      )
    ).toBe(false);
    expect(contained('bad', '2026-08-27T11:00Z', 'bad', 'bad')).toBe(false);
    expect(
      contained(
        '2026-08-27T10:00Z',
        '2026-08-27T10:00Z',
        '2026-08-27T10:00Z',
        '2026-08-27T10:00Z'
      )
    ).toBe(true);
    expect(
      latestPlacement(3600, '2026-08-27T18:00Z', '2026-08-27T19:00Z')
    ).toMatchObject({ feasible: true });
    expect(
      runnerInterval(
        {
          startTimestamp: '2026-08-27T10:00Z',
          endTimestamp: '2026-08-27T11:00Z',
        },
        [
          {
            startTimestamp: '2026-08-27T00:00Z',
            endTimestamp: '2026-08-27T01:00Z',
          },
          {
            startTimestamp: '2026-08-27T09:00Z',
            endTimestamp: '2026-08-27T12:00Z',
          },
        ],
        []
      )
    ).toEqual({ feasible: true });
    expect(
      runnerInterval(
        {
          startTimestamp: '2026-08-27T10:00Z',
          endTimestamp: '2026-08-27T11:00Z',
        },
        [
          {
            clockInTimestamp: '2026-08-27T09:00Z',
            clockOutTimestamp: '2026-08-27T12:00Z',
          },
        ],
        []
      )
    ).toEqual({ feasible: true });
    expect(
      runnerInterval(
        {
          startTimestamp: '2026-08-27T10:00Z',
          endTimestamp: '2026-08-27T11:00Z',
        },
        [
          {
            clockInPoint: { timestamp: '2026-08-27T09:00Z' },
            clockOutPoint: { timestamp: '2026-08-27T12:00Z' },
          },
        ],
        []
      )
    ).toEqual({ feasible: true });
  });

  test('covers delivery, procurement, pickup, runner overlap, composition, and search', () => {
    expect(
      delivery({
        deliveryDurationSeconds: 2700,
        deliveryPoint: base.deliveryPoint,
        nowTimestamp: base.nowTimestamp,
        runnerSchedule: schedule,
        runnerCommitments: [],
      })
    ).toMatchObject({ feasible: true });
    expect(
      procurement({
        procurementDurationSeconds: 1800,
        nowTimestamp: base.nowTimestamp,
        deliveryOutboundStartTimestamp: '2026-08-27T18:15Z',
        supplierAvailability: base.supplierAvailability,
        runnerSchedule: schedule,
        runnerCommitments: [],
      })
    ).toMatchObject({ feasible: true });
    expect(
      pickup({
        pickupDurationSeconds: 2700,
        pickupPoint: base.pickupPoint,
        runnerSchedule: schedule,
        runnerCommitments: [],
      })
    ).toMatchObject({ feasible: true });
    expect(
      runnerInterval(
        {
          startTimestamp: '2026-08-27T18:00Z',
          endTimestamp: '2026-08-27T18:30Z',
        },
        schedule,
        [
          {
            startTimestamp: '2026-08-27T18:15Z',
            endTimestamp: '2026-08-27T18:20Z',
          },
        ]
      )
    ).toEqual({ feasible: false, reason: 'runner-commitment-overlap' });
    expect(composed(base)).toMatchObject({ feasible: true });
    expect(searchResult(base)).toEqual({
      valid: true,
      results: [{ skuId: 'FOOTBALL' }],
    });
    expect(searchResult({ ...base, requestText: 'rugby' })).toEqual({
      valid: true,
      results: [],
    });
  });

  test('reports invalid and unavailable requests', () => {
    expect(delivery({})).toEqual({
      feasible: false,
      reason: 'invalid-duration',
    });
    expect(procurement({ procurementDurationSeconds: -1 })).toEqual({
      feasible: false,
      reason: 'invalid-duration',
    });
    expect(pickup({ pickupDurationSeconds: 1 })).toEqual({
      feasible: false,
      reason: 'invalid-pickup-time',
    });
    expect(runnerInterval(null, [], [])).toEqual({
      feasible: false,
      reason: 'invalid-runner-input',
    });
    expect(
      composed({
        ...base,
        durations: { ...base.durations, deliveryOutboundSeconds: -1 },
      })
    ).toEqual({ feasible: false, reason: 'delivery:invalid-duration' });
    expect(
      contained(
        '2026-08-27T12:00Z',
        '2026-08-27T11:00Z',
        base.nowTimestamp,
        base.pickupPoint.timestamp
      )
    ).toBe(false);
    expect(
      contained(
        base.nowTimestamp,
        base.pickupPoint.timestamp,
        '2026-08-27T21:00Z',
        '2026-08-27T20:00Z'
      )
    ).toBe(false);
    expect(
      contained(
        '2026-08-27T08:00Z',
        '2026-08-27T18:00Z',
        base.nowTimestamp,
        base.pickupPoint.timestamp
      )
    ).toBe(false);
    expect(latestPlacement(1800, 'bad', base.pickupPoint.timestamp)).toEqual({
      feasible: false,
      reason: 'no-placement',
    });
    expect(latestPlacement(1800, base.nowTimestamp, 'bad')).toEqual({
      feasible: false,
      reason: 'no-placement',
    });
    expect(
      latestPlacement(7200, '2026-08-27T19:00Z', base.pickupPoint.timestamp)
    ).toEqual({ feasible: false, reason: 'no-placement' });
    expect(
      runnerInterval(
        {
          startTimestamp: '2026-08-27T22:00Z',
          endTimestamp: '2026-08-27T23:00Z',
        },
        schedule,
        []
      )
    ).toEqual({ feasible: false, reason: 'outside-shift' });
    expect(
      delivery({
        deliveryDurationSeconds: 1,
        deliveryPoint: { timestamp: 'bad' },
        runnerSchedule: schedule,
        runnerCommitments: [],
      })
    ).toEqual({ feasible: false, reason: 'no-placement' });
    expect(
      procurement({
        procurementDurationSeconds: 1800,
        nowTimestamp: base.nowTimestamp,
        deliveryOutboundStartTimestamp: '2026-08-27T18:15Z',
        supplierAvailability: {
          startTimestamp: '2026-08-27T07:00Z',
          endTimestamp: '2026-08-27T08:00Z',
        },
        runnerSchedule: schedule,
        runnerCommitments: [],
      })
    ).toEqual({ feasible: false, reason: 'no-placement' });
    expect(
      pickup({
        pickupDurationSeconds: 3600,
        pickupPoint: { timestamp: 'bad' },
        runnerSchedule: schedule,
        runnerCommitments: [],
      })
    ).toEqual({ feasible: false, reason: 'invalid-pickup-time' });
    expect(
      composed({
        ...base,
        durations: { ...base.durations, procurementSeconds: -1 },
      })
    ).toEqual({ feasible: false, reason: 'procurement:invalid-duration' });
    expect(
      composed({
        ...base,
        durations: { ...base.durations, pickupReturnSeconds: -1 },
      })
    ).toEqual({ feasible: false, reason: 'pickup:invalid-duration' });
  });
});

describe('object minute rental HTTP adapter', () => {
  test('normalizes a request and reads persisted commitments', async () => {
    const db = {
      collection: jest.fn(name => {
        if (name === 'runner_assignments')
          return { where: () => ({ get: async () => ({ docs: [] }) }) };
        return { doc: () => ({ get: async () => ({ exists: false }) }) };
      }),
    };
    const json = jest.fn();
    const handler = createSearchHttpHandler({
      db,
      clock: () => new Date('2026-08-27T15:00Z'),
    });
    await handler({ body: base }, { json, status: () => ({ json }) });
    expect(json).toHaveBeenCalledWith({
      valid: true,
      results: [{ skuId: 'FOOTBALL' }],
    });
  });

  test('returns a 400 response for malformed requests', async () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const handler = createSearchHttpHandler({
      db: {},
      clock: () => new Date('2026-08-27T15:00Z'),
    });
    await handler({ body: null }, { json, status });
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      valid: false,
      reason: 'A JSON search request is required.',
    });
  });

  test('rejects invalid clock, duration, schedule, and possession input', async () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const invoke = async (options, reason, body = base) => {
      json.mockClear();
      status.mockClear();
      await createSearchHttpHandler(options)({ body }, { json, status });
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ valid: false, reason });
    };
    await invoke(
      { db: {}, clock: () => new Date('invalid') },
      'The clock returned an invalid time.'
    );
    await invoke(
      { db: {}, env: { SEARCH_DELIVERY_OUTBOUND_SECONDS: '-1' } },
      'Invalid search duration configuration.'
    );
    await invoke(
      { db: {}, env: { SEARCH_RUNNER_SCHEDULE_JSON: '{}' } },
      'Invalid runner schedule configuration.'
    );
    await invoke(
      { db: {}, clock: () => new Date('2026-08-27T15:00Z') },
      'A possession context with start and end timestamps is required.',
      { requestText: 'football' }
    );
  });
});
