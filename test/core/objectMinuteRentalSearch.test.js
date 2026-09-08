import { describe, expect, test, jest } from '@jest/globals';
import {
  composed,
  contained,
  delivery,
  exactLookup,
  latestPlacement,
  pickup,
  procurement,
  runnerInterval,
  searchResult,
  validatePossessionContextTime,
} from '../../src/core/object-minute-rental-search/search-core.js';
import {
  createSearchHttpHandler,
  dailyWindow,
  normalizeRequest,
} from '../../src/core/object-minute-rental-search/search-http.js';
import { createObjectMinuteRentalSearch } from '../../src/core/object-minute-rental-search/search-application.js';
import {
  evaluateServiceAreaFeasibility,
  pointInsideWgs84Circle,
  SOPHIE_CHARLOTTE_SERVICE_AREA,
} from '../../src/core/object-minute-rental-search/service-area.js';
// Reuse the established wrapper-level assertions so the direct core mutation
// run observes every externally visible feasibility branch as well.
import '../toys/2026-08-27/searchFeasibility.test.js';

const schedule = [
  { startTimestamp: '2026-08-27T15:00Z', endTimestamp: '2026-08-27T21:00Z' },
];
const base = {
  requestText: 'football',
  deliveryPoint: {
    timestamp: '2026-08-27T19:00Z',
    latitude: 52.510833,
    longitude: 13.296667,
  },
  pickupPoint: {
    timestamp: '2026-08-27T20:00Z',
    latitude: 52.510833,
    longitude: 13.296667,
  },
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
const emptyRepository = { listForRunner: async () => [] };

describe('possession context temporal validity', () => {
  test.each([
    [
      'positive duration',
      '2026-08-27T19:00Z',
      '2026-08-27T20:00Z',
      { valid: true },
    ],
    [
      'zero duration',
      '2026-08-27T19:00Z',
      '2026-08-27T19:00Z',
      { valid: true },
    ],
    [
      'reversed interval',
      '2026-08-27T20:00Z',
      '2026-08-27T19:00Z',
      { valid: false, reason: 'possession-end-before-start' },
    ],
    [
      'invalid start',
      'not-a-time',
      '2026-08-27T20:00Z',
      { valid: false, reason: 'invalid-possession-start-time' },
    ],
    [
      'invalid end',
      '2026-08-27T19:00Z',
      'not-a-time',
      { valid: false, reason: 'invalid-possession-end-time' },
    ],
  ])(
    'validates possession context time: %s',
    (_label, start, end, expected) => {
      expect(
        validatePossessionContextTime({
          startPoint: { timestamp: start },
          endPoint: { timestamp: end },
        })
      ).toEqual(expected);
    }
  );

  test('rejects a missing possession context', () => {
    expect(validatePossessionContextTime()).toEqual({
      valid: false,
      reason: 'invalid-possession-start-time',
    });
  });
});

describe('service-area feasibility', () => {
  test('rejects missing primitive inputs', () => {
    expect(pointInsideWgs84Circle()).toBe(false);
    expect(
      pointInsideWgs84Circle({
        point: base.deliveryPoint,
        circle: { center: base.deliveryPoint, radiusMeters: -1 },
      })
    ).toBe(false);
    expect(evaluateServiceAreaFeasibility()).toEqual({
      valid: false,
      reason: 'invalid-service-area',
    });
  });

  test('accepts two points inside the configured circle', () => {
    expect(
      evaluateServiceAreaFeasibility({
        deliveryPoint: base.deliveryPoint,
        pickupPoint: base.pickupPoint,
        serviceArea: SOPHIE_CHARLOTTE_SERVICE_AREA,
      })
    ).toEqual({ valid: true, feasible: true });
  });

  test.each([
    ['delivery', { latitude: 52.6, longitude: 13.296667 }, base.pickupPoint],
    ['pickup', base.deliveryPoint, { latitude: 52.6, longitude: 13.296667 }],
  ])(
    'rejects a valid %s point outside the circle',
    (_name, deliveryPoint, pickupPoint) => {
      expect(
        evaluateServiceAreaFeasibility({
          deliveryPoint,
          pickupPoint,
          serviceArea: SOPHIE_CHARLOTTE_SERVICE_AREA,
        })
      ).toEqual({ valid: true, feasible: false });
    }
  );

  test('includes a point exactly on a zero-radius boundary', () => {
    const point = { latitude: 52.510833, longitude: 13.296667 };
    expect(
      evaluateServiceAreaFeasibility({
        deliveryPoint: point,
        pickupPoint: point,
        serviceArea: { center: point, radiusMeters: 0 },
      })
    ).toEqual({ valid: true, feasible: true });
  });

  test.each([
    ['invalid-delivery-location', { latitude: 'bad' }, base.pickupPoint],
    ['invalid-delivery-location', { latitude: Infinity }, base.pickupPoint],
    ['invalid-pickup-location', base.deliveryPoint, { longitude: 181 }],
  ])(
    'rejects malformed request coordinates with %s',
    (reason, deliveryPoint, pickupPoint) => {
      expect(
        evaluateServiceAreaFeasibility({
          deliveryPoint,
          pickupPoint,
          serviceArea: SOPHIE_CHARLOTTE_SERVICE_AREA,
        })
      ).toEqual({ valid: false, reason });
    }
  );

  test.each([null, '', '   ', undefined])(
    'rejects blank delivery latitude as invalid-delivery-location: %p',
    latitude => {
      expect(
        evaluateServiceAreaFeasibility({
          deliveryPoint: { ...base.deliveryPoint, latitude },
          pickupPoint: base.pickupPoint,
          serviceArea: SOPHIE_CHARLOTTE_SERVICE_AREA,
        })
      ).toEqual({ valid: false, reason: 'invalid-delivery-location' });
    }
  );

  test.each([null, '', '   ', undefined])(
    'rejects blank pickup longitude as invalid-pickup-location: %p',
    longitude => {
      expect(
        evaluateServiceAreaFeasibility({
          deliveryPoint: base.deliveryPoint,
          pickupPoint: { ...base.pickupPoint, longitude },
          serviceArea: SOPHIE_CHARLOTTE_SERVICE_AREA,
        })
      ).toEqual({ valid: false, reason: 'invalid-pickup-location' });
    }
  );

  test('accepts numeric strings and preserves zero values', () => {
    expect(
      evaluateServiceAreaFeasibility({
        deliveryPoint: { latitude: '0', longitude: '0' },
        pickupPoint: { latitude: '0', longitude: '0' },
        serviceArea: {
          center: { latitude: '0', longitude: '0' },
          radiusMeters: '0',
        },
      })
    ).toEqual({ valid: true, feasible: true });
  });

  test.each([null, '', '   ', undefined])(
    'rejects blank service-area radius as invalid-service-area: %p',
    radiusMeters => {
      expect(
        evaluateServiceAreaFeasibility({
          deliveryPoint: base.deliveryPoint,
          pickupPoint: base.pickupPoint,
          serviceArea: { center: base.deliveryPoint, radiusMeters },
        })
      ).toEqual({ valid: false, reason: 'invalid-service-area' });
    }
  );

  test.each([null, '', '   ', undefined])(
    'rejects blank service-area center latitude as invalid-service-area: %p',
    latitude => {
      expect(
        evaluateServiceAreaFeasibility({
          deliveryPoint: base.deliveryPoint,
          pickupPoint: base.pickupPoint,
          serviceArea: {
            center: { latitude, longitude: base.deliveryPoint.longitude },
            radiusMeters: 0,
          },
        })
      ).toEqual({ valid: false, reason: 'invalid-service-area' });
    }
  );

  test('fails closed for malformed service-area configuration', () => {
    expect(
      evaluateServiceAreaFeasibility({
        deliveryPoint: base.deliveryPoint,
        pickupPoint: base.pickupPoint,
        serviceArea: { center: base.deliveryPoint, radiusMeters: -1 },
      })
    ).toEqual({ valid: false, reason: 'invalid-service-area' });
  });
});

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
        'bad',
        '2026-08-27T11:00Z',
        '2026-08-27T09:00Z',
        '2026-08-27T12:00Z'
      )
    ).toBe(false);
    expect(
      contained(
        '2026-08-27T10:00Z',
        '2026-08-27T10:00Z',
        '2026-08-27T10:00Z',
        '2026-08-27T10:00Z'
      )
    ).toBe(true);
    expect(
      contained(
        '2026-08-27T11:00Z',
        '2026-08-27T10:00Z',
        '2026-08-27T09:00Z',
        '2026-08-27T12:00Z'
      )
    ).toBe(false);
    expect(
      contained(
        '2026-08-27T10:00Z',
        '2026-08-27T11:00Z',
        '2026-08-27T12:00Z',
        '2026-08-27T09:00Z'
      )
    ).toBe(false);
    expect(
      contained(
        '2026-08-27T10:00Z',
        '2026-08-27T13:00Z',
        '2026-08-27T09:00Z',
        '2026-08-27T12:00Z'
      )
    ).toBe(false);
    expect(
      contained(
        '2026-08-27T10:00Z',
        '2026-08-27T11:00Z',
        '2026-08-27T09:00Z',
        '2026-08-27T10:30Z'
      )
    ).toBe(false);
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
          startTimestamp: '2026-08-27T16:00Z',
          endTimestamp: '2026-08-27T17:00Z',
        },
        schedule,
        [
          {
            startTimestamp: '2026-08-27T16:30Z',
            endTimestamp: '2026-08-27T16:45Z',
          },
        ]
      )
    ).toEqual({ feasible: false, reason: 'runner-commitment-overlap' });
    expect(
      runnerInterval(
        {
          startTimestamp: '2026-08-27T16:00Z',
          endTimestamp: '2026-08-27T17:00Z',
        },
        schedule,
        [
          {
            startTimestamp: '2026-08-27T17:00Z',
            endTimestamp: '2026-08-27T18:00Z',
          },
        ]
      )
    ).toEqual({ feasible: true });
    expect(
      runnerInterval(
        {
          startTimestamp: '2026-08-27T16:00Z',
          endTimestamp: '2026-08-27T17:00Z',
        },
        schedule,
        [
          {
            startTimestamp: '2026-08-27T15:00Z',
            endTimestamp: '2026-08-27T16:00Z',
          },
        ]
      )
    ).toEqual({ feasible: true });
    expect(
      contained(
        '2026-08-27T10:00Z',
        '2026-08-27T11:00Z',
        'bad',
        '2026-08-27T12:00Z'
      )
    ).toBe(false);
    expect(
      contained(
        '2026-08-27T10:00Z',
        '2026-08-27T11:00Z',
        '2026-08-27T09:00Z',
        'bad'
      )
    ).toBe(false);
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

  test('rejects windows missing both boundary representations', () => {
    expect(
      runnerInterval(
        {
          startTimestamp: '2026-08-27T10:00Z',
          endTimestamp: '2026-08-27T11:00Z',
        },
        [{ startTimestamp: '2026-08-27T09:00Z' }],
        []
      )
    ).toEqual({ feasible: false, reason: 'outside-shift' });
    expect(
      runnerInterval(
        {
          startTimestamp: '2026-08-27T10:00Z',
          endTimestamp: '2026-08-27T11:00Z',
        },
        [{ endTimestamp: '2026-08-27T12:00Z' }],
        []
      )
    ).toEqual({ feasible: false, reason: 'outside-shift' });
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
      delivery({
        deliveryDurationSeconds: 2700,
        deliveryPoint: { timestamp: '2026-08-27T19:00Z' },
        runnerSchedule: schedule,
        runnerCommitments: [],
      })
    ).toMatchObject({ feasible: true });
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
    expect(
      delivery({
        deliveryDurationSeconds: 0,
        nowTimestamp: '2026-08-27T15:00Z',
        deliveryPoint: { timestamp: '2026-08-27T15:00Z' },
        runnerSchedule: schedule,
        runnerCommitments: [],
      })
    ).toMatchObject({ feasible: true });
    expect(
      delivery({
        deliveryDurationSeconds: 0,
        deliveryPoint: { timestamp: '1970-01-01T00:00:00Z' },
        runnerSchedule: [
          {
            startTimestamp: '1970-01-01T00:00:00Z',
            endTimestamp: '1970-01-01T01:00:00Z',
          },
        ],
        runnerCommitments: [],
      })
    ).toMatchObject({ feasible: true });
    expect(
      delivery({
        deliveryDurationSeconds: 0,
        earliestStartTimestamp: '2026-08-27T16:00Z',
        nowTimestamp: '2026-08-27T15:00Z',
        deliveryPoint: { timestamp: '2026-08-27T15:00Z' },
        runnerSchedule: schedule,
        runnerCommitments: [],
      })
    ).toEqual({ feasible: false, reason: 'no-placement' });
    expect(
      procurement({
        procurementDurationSeconds: 21600,
        nowTimestamp: '2026-08-27T08:00Z',
        deliveryOutboundStartTimestamp: '2026-08-27T15:00Z',
        supplierAvailability: {
          startTimestamp: '2026-08-27T09:00Z',
          endTimestamp: '2026-08-27T14:00Z',
        },
        runnerSchedule: schedule,
        runnerCommitments: [],
      })
    ).toEqual({ feasible: false, reason: 'outside-supplier-window' });
  });
});

describe('object minute rental HTTP adapter', () => {
  test('handles allowed CORS preflight without reading search dependencies', async () => {
    const listForRunner = jest.fn();
    const json = jest.fn();
    const setHeader = jest.fn();
    const status = jest.fn(() => ({ json }));
    await createSearchHttpHandler({
      runnerCommitmentsRepository: { listForRunner },
      env: { SEARCH_ALLOWED_ORIGINS: 'https://mattheard.net' },
    })(
      { method: 'OPTIONS', headers: { origin: 'https://mattheard.net' } },
      {
        setHeader,
        status,
        json,
      }
    );
    expect(status).toHaveBeenCalledWith(204);
    expect(listForRunner).not.toHaveBeenCalled();
    expect(setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://mattheard.net'
    );
    expect(setHeader).toHaveBeenCalledWith('Vary', 'Origin');
    expect(setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Content-Type'
    );
  });

  test('does not grant CORS access or invoke search for a disallowed preflight', async () => {
    const listForRunner = jest.fn();
    const setHeader = jest.fn();
    const json = jest.fn();
    await createSearchHttpHandler({
      runnerCommitmentsRepository: { listForRunner },
      env: { SEARCH_ALLOWED_ORIGINS: 'https://mattheard.net' },
    })(
      { method: 'OPTIONS', headers: { origin: 'https://other.example' } },
      {
        setHeader,
        status: () => ({ json }),
        json,
      }
    );
    expect(setHeader).not.toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://other.example'
    );
    expect(listForRunner).not.toHaveBeenCalled();
  });

  test('rejects unsupported methods before reading search dependencies', async () => {
    const listForRunner = jest.fn();
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    await createSearchHttpHandler({
      runnerCommitmentsRepository: { listForRunner },
    })({ method: 'GET', headers: {} }, { status, json });
    expect(status).toHaveBeenCalledWith(405);
    expect(listForRunner).not.toHaveBeenCalled();
  });

  test('loads an injected runner schedule provider per request', async () => {
    const json = jest.fn();
    const getSchedule = jest.fn(async () => schedule);
    await createSearchHttpHandler({
      runnerCommitmentsRepository: emptyRepository,
      runnerScheduleProvider: { getSchedule },
      env: { SEARCH_RUNNER_ID: 'RUNNER-7' },
      clock: () => new Date('2026-08-27T15:00Z'),
    })(
      { method: 'POST', headers: {}, body: base },
      { json, status: () => ({ json }) }
    );
    expect(getSchedule).toHaveBeenCalledWith({ runnerId: 'RUNNER-7' });
    expect(json).toHaveBeenCalledWith({
      valid: true,
      results: [{ skuId: 'FOOTBALL' }],
    });
  });

  test('uses default runner id and fallback on invalid timezone input', async () => {
    const getSchedule = jest.fn(async () => schedule);
    await createSearchHttpHandler({
      runnerCommitmentsRepository: emptyRepository,
      runnerScheduleProvider: { getSchedule },
      clock: () => new Date('2026-08-27T15:00Z'),
    })(
      { method: 'POST', headers: {}, body: base },
      { json: jest.fn(), status: () => ({ json: jest.fn() }) }
    );
    expect(getSchedule).toHaveBeenCalledWith({ runnerId: 'RUNNER-1' });
    expect(dailyWindow('07:00', 'not-a-date', 'fallback', 'UTC')).toBe(
      'fallback'
    );
    expect(dailyWindow('', 'not-a-date', 'fallback', 'UTC')).toBe('fallback');
  });

  test('normalizes a request and reads persisted commitments', async () => {
    const listForRunner = jest.fn(async () => []);
    const json = jest.fn();
    const handler = createSearchHttpHandler({
      runnerCommitmentsRepository: { listForRunner },
      clock: () => new Date('2026-08-27T15:00Z'),
    });
    await handler({ body: base }, { json, status: () => ({ json }) });
    expect(json).toHaveBeenCalledWith({
      valid: true,
      results: [{ skuId: 'FOOTBALL' }],
    });
    expect(listForRunner).toHaveBeenCalledWith({ runnerId: 'RUNNER-1' });
    await createSearchHttpHandler({
      runnerCommitmentsRepository: { listForRunner },
      env: { SEARCH_RUNNER_ID: 'RUNNER-9' },
      clock: () => new Date('2026-08-27T15:00Z'),
    })({ body: base }, { json, status: () => ({ json }) });
    expect(listForRunner).toHaveBeenLastCalledWith({ runnerId: 'RUNNER-9' });
    listForRunner.mockRejectedValueOnce(new Error('database failure'));
    await createSearchHttpHandler({
      runnerCommitmentsRepository: { listForRunner },
      clock: () => new Date('2026-08-27T15:00Z'),
    })({ body: base }, { json, status: () => ({ json }) });
    expect(json).toHaveBeenLastCalledWith({
      valid: false,
      reason: 'database failure',
    });
    expect(
      normalizeRequest(
        { ...base, requestText: undefined, searchText: 'football' },
        {},
        () => new Date('2026-08-27T15:00Z')
      ).requestText
    ).toBe('football');
  });

  test('returns a 400 response for malformed requests', async () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const handler = createSearchHttpHandler({
      runnerCommitmentsRepository: emptyRepository,
      clock: () => new Date('2026-08-27T15:00Z'),
    });
    await handler({ body: null }, { json, status });
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      valid: false,
      reason: 'A JSON search request is required.',
    });
    json.mockClear();
    await handler({ body: undefined }, { json, status });
    expect(json).toHaveBeenCalledWith({
      valid: false,
      reason: 'A JSON search request is required.',
    });
  });

  test('rejects temporally invalid possession before reading commitments', async () => {
    const listForRunner = jest.fn(async () => []);
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const handler = createSearchHttpHandler({
      runnerCommitmentsRepository: { listForRunner },
      clock: () => new Date('2026-08-27T15:00Z'),
    });

    await handler(
      {
        body: {
          ...base,
          deliveryPoint: { timestamp: '2026-08-27T20:00Z' },
          pickupPoint: { timestamp: '2026-08-27T19:00Z' },
        },
      },
      { json, status }
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      valid: false,
      reason: 'possession-end-before-start',
    });
    expect(listForRunner).not.toHaveBeenCalled();
  });

  test('returns an empty successful search and skips commitments for out-of-area points', async () => {
    const listForRunner = jest.fn(async () => []);
    const json = jest.fn();
    const handler = createSearchHttpHandler({
      runnerCommitmentsRepository: { listForRunner },
      clock: () => new Date('2026-08-27T15:00Z'),
    });
    await handler(
      {
        body: {
          ...base,
          deliveryPoint: { ...base.deliveryPoint, latitude: 52.6 },
        },
      },
      { json, status: () => ({ json }) }
    );
    expect(json).toHaveBeenCalledWith({ valid: true, results: [] });
    expect(listForRunner).not.toHaveBeenCalled();
  });

  test('rejects malformed spatial input before commitments', async () => {
    const listForRunner = jest.fn(async () => []);
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    await createSearchHttpHandler({
      runnerCommitmentsRepository: { listForRunner },
      clock: () => new Date('2026-08-27T15:00Z'),
    })(
      {
        body: { ...base, pickupPoint: { ...base.pickupPoint, longitude: 181 } },
      },
      { json, status }
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      valid: false,
      reason: 'invalid-pickup-location',
    });
    expect(listForRunner).not.toHaveBeenCalled();
  });

  test('preserves temporal error precedence over spatial errors', async () => {
    const listForRunner = jest.fn(async () => []);
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    await createSearchHttpHandler({
      runnerCommitmentsRepository: { listForRunner },
      clock: () => new Date('2026-08-27T15:00Z'),
    })(
      {
        body: {
          ...base,
          deliveryPoint: { ...base.deliveryPoint, latitude: 52.6 },
          pickupPoint: { ...base.pickupPoint, timestamp: '2026-08-27T18:00Z' },
        },
      },
      { json, status }
    );
    expect(json).toHaveBeenCalledWith({
      valid: false,
      reason: 'possession-end-before-start',
    });
    expect(listForRunner).not.toHaveBeenCalled();
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
      {
        runnerCommitmentsRepository: emptyRepository,
        clock: () => new Date('invalid'),
      },
      'The clock returned an invalid time.'
    );
    await invoke(
      {
        runnerCommitmentsRepository: emptyRepository,
        env: { SEARCH_DELIVERY_OUTBOUND_SECONDS: '-1' },
      },
      'Invalid search duration configuration.'
    );
    await invoke(
      {
        runnerCommitmentsRepository: emptyRepository,
        env: { SEARCH_RUNNER_SCHEDULE_JSON: '{}' },
      },
      'Invalid runner schedule configuration.'
    );
    await invoke(
      {
        runnerCommitmentsRepository: emptyRepository,
        clock: () => new Date('2026-08-27T15:00Z'),
      },
      'A possession context with start and end timestamps is required.',
      { requestText: 'football' }
    );
    await invoke(
      {
        runnerCommitmentsRepository: emptyRepository,
        clock: () => new Date('2026-08-27T15:00Z'),
      },
      'A possession context with start and end timestamps is required.',
      { requestText: 'football', pickupPoint: base.pickupPoint }
    );
    await invoke(
      {
        runnerCommitmentsRepository: emptyRepository,
        clock: () => new Date('2026-08-27T15:00Z'),
      },
      'A possession context with start and end timestamps is required.',
      { requestText: 'football', deliveryPoint: base.deliveryPoint }
    );
    await invoke(
      {
        runnerCommitmentsRepository: emptyRepository,
        clock: () => new Date('2026-08-27T15:00Z'),
      },
      'A JSON search request is required.',
      'not-an-object'
    );
  });

  test('uses the default runner when no runner id is configured', async () => {
    const listForRunner = jest.fn(async () => []);
    const search = createObjectMinuteRentalSearch({
      runnerCommitmentsRepository: { listForRunner },
      serviceArea: SOPHIE_CHARLOTTE_SERVICE_AREA,
    });
    await search(base);
    expect(listForRunner).toHaveBeenCalledWith({ runnerId: 'RUNNER-1' });
  });

  test('reports non-Error HTTP failures as strings', async () => {
    const handler = createSearchHttpHandler({
      runnerCommitmentsRepository: {
        listForRunner: async () => {
          throw 'storage-failure';
        },
      },
    });
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    await handler({ body: base }, { json, status });
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      valid: false,
      reason: 'storage-failure',
    });
  });

  test('preserves non-format supplier values and accepts zero durations', async () => {
    const json = jest.fn();
    const handler = createSearchHttpHandler({
      runnerCommitmentsRepository: emptyRepository,
      env: {
        SEARCH_SUPPLIER_START: '16:00x',
        SEARCH_DELIVERY_OUTBOUND_SECONDS: '0',
        SEARCH_PROCUREMENT_SECONDS: '0',
        SEARCH_PICKUP_RETURN_SECONDS: '0',
      },
      clock: () => new Date('2026-08-27T15:00Z'),
    });
    await handler({ body: base }, { json, status: () => ({ json }) });
    expect(json).toHaveBeenCalledWith({ valid: true, results: [] });
  });

  test('distinguishes a strict daily supplier window from a suffix value', async () => {
    const body = {
      ...base,
      deliveryPoint: {
        ...base.deliveryPoint,
        timestamp: '2026-08-27T16:00Z',
      },
      pickupPoint: {
        ...base.pickupPoint,
        timestamp: '2026-08-27T16:00Z',
      },
    };
    const json = jest.fn();
    await createSearchHttpHandler({
      runnerCommitmentsRepository: emptyRepository,
      env: {
        SEARCH_SUPPLIER_START: '16:00x',
        SEARCH_DELIVERY_OUTBOUND_SECONDS: '0',
        SEARCH_PROCUREMENT_SECONDS: '0',
        SEARCH_PICKUP_RETURN_SECONDS: '0',
      },
      clock: () => new Date('2026-08-27T15:00Z'),
    })({ body }, { json, status: () => ({ json }) });
    expect(json).toHaveBeenCalledWith({ valid: true, results: [] });
    json.mockClear();
    await createSearchHttpHandler({
      runnerCommitmentsRepository: emptyRepository,
      env: {
        SEARCH_SUPPLIER_START: 'x16:00',
        SEARCH_DELIVERY_OUTBOUND_SECONDS: '0',
        SEARCH_PROCUREMENT_SECONDS: '0',
        SEARCH_PICKUP_RETURN_SECONDS: '0',
      },
      clock: () => new Date('2026-08-27T15:00Z'),
    })({ body }, { json, status: () => ({ json }) });
    expect(json).toHaveBeenCalledWith({ valid: true, results: [] });
    json.mockClear();
    await createSearchHttpHandler({
      runnerCommitmentsRepository: emptyRepository,
      env: {
        SEARCH_SUPPLIER_START: '16:00',
        SEARCH_DELIVERY_OUTBOUND_SECONDS: '0',
        SEARCH_PROCUREMENT_SECONDS: '0',
        SEARCH_PICKUP_RETURN_SECONDS: '0',
      },
      clock: () => new Date('2026-08-27T15:00Z'),
    })({ body }, { json, status: () => ({ json }) });
    expect(json).toHaveBeenCalledWith({
      valid: true,
      results: [{ skuId: 'FOOTBALL' }],
    });
    json.mockClear();
    await createSearchHttpHandler({
      runnerCommitmentsRepository: emptyRepository,
      env: { SEARCH_SUPPLIER_START: undefined },
      clock: () => new Date('2026-08-27T15:00Z'),
    })({ body: base }, { json, status: () => ({ json }) });
    expect(json).toHaveBeenCalledWith({
      valid: true,
      results: [{ skuId: 'FOOTBALL' }],
    });
    expect(dailyWindow('16:00', '2026-08-27T15:00Z', 'fallback')).toBe(
      '2026-08-27T16:00:00Z'
    );
    expect(
      dailyWindow('07:00', '2026-01-15T12:00Z', 'fallback', 'Europe/Berlin')
    ).toBe('2026-01-15T06:00:00Z');
    expect(
      dailyWindow('07:00', '2026-07-15T12:00Z', 'fallback', 'Europe/Berlin')
    ).toBe('2026-07-15T05:00:00Z');
    expect(
      dailyWindow('07:00', '2026-07-15T12:00Z', 'fallback', 'Not/A-Timezone')
    ).toBe('07:00');
    expect(dailyWindow('16:00x', '2026-08-27T15:00Z', 'fallback')).toBe(
      '16:00x'
    );
    expect(dailyWindow('x16:00', '2026-08-27T15:00Z', 'fallback')).toBe(
      'x16:00'
    );
    expect(dailyWindow('', '2026-08-27T15:00Z', 'fallback')).toBe('fallback');
    expect(
      normalizeRequest(
        base,
        { SEARCH_SUPPLIER_START: undefined },
        () => new Date('2026-08-27T15:00Z')
      ).supplierAvailability.startTimestamp
    ).toBe('2026-08-27T07:00:00Z');
  });
});
