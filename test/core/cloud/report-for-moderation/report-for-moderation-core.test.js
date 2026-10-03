import { jest } from '@jest/globals';
import {
  computeModerationUrgency,
  createReportForModerationHandler,
  createCorsOriginValidator,
  createCorsOptions,
  createHandleReportForModeration,
} from '../../../../src/core/cloud/report-for-moderation/report-for-moderation-core.js';

describe('createReportForModerationHandler', () => {
  it('reads current dependencies in order on each call, before method guarding', async () => {
    const reads = [];
    const first = jest.fn();
    const second = jest.fn();
    let persist = first;
    const dependencies = {
      get addModerationReport() {
        reads.push('add');
        return persist;
      },
      get hasModerationReport() {
        reads.push('duplicate');
        return undefined;
      },
      get getServerTimestamp() {
        reads.push('timestamp');
        return () => 'ts';
      },
    };
    const handler = createReportForModerationHandler(dependencies);
    expect(reads).toEqual(['add', 'timestamp']);
    reads.length = 0;
    await expect(handler()).resolves.toEqual({
      status: 405,
      body: 'POST only',
    });
    expect(reads).toEqual(['add', 'duplicate', 'timestamp']);
    reads.length = 0;
    persist = second;
    await expect(
      handler({ method: 'POST', body: { variant: 'v', reporterId: 'r' } })
    ).resolves.toEqual({ status: 201, body: {} });
    expect(reads).toEqual(['add', 'duplicate', 'timestamp']);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({
      variant: 'v',
      reporterIdentity: 'r',
      createdAt: 'ts',
    });
  });

  it('propagates dependency getter errors synchronously before method guarding', () => {
    const failure = new Error('unavailable dependency');
    let broken = false;
    const dependencies = {
      get addModerationReport() {
        if (broken) throw failure;
        return () => {};
      },
      getServerTimestamp: () => 'ts',
    };
    const handler = createReportForModerationHandler(dependencies);
    broken = true;
    expect(() => handler({ method: 'GET' })).toThrow(failure);
  });

  it('validates dependencies before returning the handler', () => {
    expect(() =>
      createReportForModerationHandler({
        addModerationReport: null,
        getServerTimestamp: () => 0,
      })
    ).toThrow(new TypeError('addModerationReport must be a function'));

    expect(() =>
      createReportForModerationHandler({
        addModerationReport: () => {},
        getServerTimestamp: null,
      })
    ).toThrow(new TypeError('getServerTimestamp must be a function'));
  });

  it('returns 400 when variant is missing or blank', async () => {
    const addModerationReport = jest.fn();
    const handler = createReportForModerationHandler({
      addModerationReport,
      getServerTimestamp: jest.fn(),
    });

    await expect(handler({ method: 'POST', body: null })).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid variant',
    });

    await expect(
      handler({ method: 'POST', body: { variant: '   ' } })
    ).resolves.toEqual({ status: 400, body: 'Missing or invalid variant' });

    expect(addModerationReport).not.toHaveBeenCalled();
  });

  it.each([
    () => ({
      reporterIdentity: ' anon-1 ',
      get reporterId() {
        throw new Error('must not read alternate identity');
      },
    }),
    () => ({
      reporterIdentity: '\t ',
      reporterId: ' anon-1 ',
      get anonymousReporterId() {
        throw new Error('must not read anonymous identity');
      },
    }),
    () => ({
      reporterIdentity: 12,
      reporterId: null,
      anonymousReporterId: ' anon-1 ',
    }),
    () => ({
      reporterIdentity: {
        toString() {
          throw new Error('must not coerce identity');
        },
      },
      anonymousReporterId: '\n anon-1 \t',
    }),
  ])(
    'persists a valid report with lazy identity precedence: %#',
    async makeIdentity => {
      const identity = makeIdentity();
      const addModerationReport = jest.fn().mockResolvedValue(undefined);
      const getServerTimestamp = jest.fn(() => 'ts');
      const handler = createReportForModerationHandler({
        addModerationReport,
        getServerTimestamp,
      });

      const response = await handler({
        method: 'POST',
        body: Object.defineProperties(
          { variant: ' slug ' },
          Object.getOwnPropertyDescriptors(identity)
        ),
      });

      expect(addModerationReport).toHaveBeenCalledWith({
        variant: 'slug',
        reporterIdentity: 'anon-1',
        createdAt: 'ts',
      });
      expect(response).toEqual({ status: 201, body: {} });
    }
  );

  it('rejects duplicate reports from the same reporter', async () => {
    const addModerationReport = jest.fn();
    const hasModerationReport = jest.fn().mockResolvedValue(true);
    const handler = createReportForModerationHandler({
      addModerationReport,
      hasModerationReport,
      getServerTimestamp: jest.fn(),
    });

    await expect(
      handler({
        method: 'POST',
        body: { variant: 'slug', reporterIdentity: 'anon-1' },
      })
    ).resolves.toEqual({ status: 409, body: 'Report already exists' });

    expect(addModerationReport).not.toHaveBeenCalled();
  });

  it('rejects reports without a reporter identity', async () => {
    const addModerationReport = jest.fn();
    const handler = createReportForModerationHandler({
      addModerationReport,
      getServerTimestamp: jest.fn(),
    });

    await expect(
      handler({
        method: 'POST',
        body: { variant: 'slug' },
      })
    ).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid reporter identity',
    });
  });

  it('rejects methods other than POST before reaching the handler', async () => {
    const addModerationReport = jest.fn();
    const getServerTimestamp = jest.fn();
    const handler = createReportForModerationHandler({
      addModerationReport,
      getServerTimestamp,
    });

    const response = await handler({ method: 'OPTIONS' });
    expect(response).toEqual({ status: 405, body: 'POST only' });
    expect(addModerationReport).not.toHaveBeenCalled();
    expect(getServerTimestamp).not.toHaveBeenCalled();
  });

  it('returns 405 when request argument is omitted', async () => {
    const addModerationReport = jest.fn();
    const getServerTimestamp = jest.fn();
    const handler = createReportForModerationHandler({
      addModerationReport,
      getServerTimestamp,
    });

    const response = await handler();
    expect(response).toEqual({ status: 405, body: 'POST only' });
    expect(addModerationReport).not.toHaveBeenCalled();
    expect(getServerTimestamp).not.toHaveBeenCalled();
  });
});

describe('computeModerationUrgency', () => {
  it('ranks pages higher when the allowed urgency signals are stronger', () => {
    const urgent = computeModerationUrgency({
      reportCount: 5,
      reportRecency: 1,
      pageAge: 1,
      timeSinceLastReview: 1,
      visibilityDistanceFromThreshold: 1,
      moderationCount: 0,
    });
    const calm = computeModerationUrgency({
      reportCount: 0,
      reportRecency: 0,
      pageAge: 0,
      timeSinceLastReview: 0,
      visibilityDistanceFromThreshold: 0,
      moderationCount: 5,
    });

    expect(urgent).toBeGreaterThan(calm);
    expect(urgent).toBeLessThanOrEqual(1);
    expect(calm).toBeGreaterThanOrEqual(0);
  });

  it('clamps non-finite signal inputs to zero', () => {
    expect(
      computeModerationUrgency({
        reportCount: Number.NaN,
        reportRecency: Number.POSITIVE_INFINITY,
        pageAge: Number.NEGATIVE_INFINITY,
        timeSinceLastReview: Number.NaN,
        visibilityDistanceFromThreshold: Number.NaN,
        moderationCount: Number.NaN,
      })
    ).toBe(0);
  });

  it('preserves each configured signal weight and normalization divisor', () => {
    const base = {
      reportCount: 0,
      reportRecency: 0,
      pageAge: 0,
      timeSinceLastReview: 0,
      visibilityDistanceFromThreshold: 0,
      moderationCount: 5,
    };
    expect(computeModerationUrgency({ ...base, reportCount: 2.5 })).toBeCloseTo(
      0.15
    );
    expect(
      computeModerationUrgency({ ...base, reportRecency: 0.5 })
    ).toBeCloseTo(0.1);
    expect(computeModerationUrgency({ ...base, pageAge: 0.5 })).toBeCloseTo(
      0.05
    );
    expect(
      computeModerationUrgency({ ...base, timeSinceLastReview: 0.5 })
    ).toBeCloseTo(0.075);
    expect(
      computeModerationUrgency({
        ...base,
        visibilityDistanceFromThreshold: 0.5,
      })
    ).toBeCloseTo(0.1);
    expect(
      computeModerationUrgency({ ...base, moderationCount: 2.5 })
    ).toBeCloseTo(0.025);
  });
});

describe('createCorsOriginValidator', () => {
  it('allows requests without an origin', () => {
    const validator = createCorsOriginValidator(['https://allowed.test']);
    const cb = jest.fn();

    validator(undefined, cb);

    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('rejects disallowed origins', () => {
    const validator = createCorsOriginValidator(['https://allowed.test']);
    const cb = jest.fn();

    validator('https://denied.test', cb);

    expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(cb.mock.calls[0][0].message).toBe('CORS');
    expect(cb.mock.calls[0][1]).toBeUndefined();
  });

  it('falls back to an empty whitelist when origins are not arrays', () => {
    const validator = createCorsOriginValidator(null);
    const cb = jest.fn();

    validator('https://denied.test', cb);

    expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(cb.mock.calls[0][0].message).toBe('CORS');
  });

  it('does not accidentally whitelist the fallback sentinel origin', () => {
    const validator = createCorsOriginValidator(undefined);
    const cb = jest.fn();

    validator('Stryker was here', cb);

    expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(cb.mock.calls[0][0].message).toBe('CORS');
  });
});

describe('createCorsOptions', () => {
  it('builds cors configuration with default POST method', () => {
    const options = createCorsOptions({
      allowedOrigins: ['https://allowed.test'],
    });

    expect(options.methods).toEqual(['POST']);
    const cb = jest.fn();
    options.origin('https://allowed.test', cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('accepts custom methods', () => {
    const options = createCorsOptions({
      allowedOrigins: [],
      methods: ['POST', 'OPTIONS'],
    });

    expect(options.methods).toEqual(['POST', 'OPTIONS']);
  });
});

describe('createHandleReportForModeration', () => {
  it('validates the handler dependency', () => {
    expect(() => createHandleReportForModeration(null)).toThrow(
      new TypeError('reportForModerationHandler must be a function')
    );
  });

  it('returns 405 for non-POST requests before invoking the handler', async () => {
    const handler = jest.fn().mockResolvedValue({ status: 200, body: {} });
    const respond = createHandleReportForModeration(handler);
    const res = {
      status: jest.fn(() => res),
      send: jest.fn(),
      json: jest.fn(),
      sendStatus: jest.fn(),
    };

    await respond({ method: 'GET' }, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith('POST only');
    expect(handler).not.toHaveBeenCalled();
  });

  it('forwards string responses via send', async () => {
    const handler = jest.fn().mockResolvedValue({
      status: 405,
      body: 'POST only',
    });
    const respond = createHandleReportForModeration(handler);
    const res = {
      status: jest.fn(() => res),
      send: jest.fn(),
      json: jest.fn(),
      sendStatus: jest.fn(),
    };

    await respond({ method: 'GET' }, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith('POST only');
    expect(res.json).not.toHaveBeenCalled();
    expect(res.sendStatus).not.toHaveBeenCalled();
  });

  it('routes POST string responses through send', async () => {
    const handler = jest.fn().mockResolvedValue({
      status: 200,
      body: 'OK',
    });
    const respond = createHandleReportForModeration(handler);
    const res = {
      status: jest.fn(() => res),
      send: jest.fn(),
      json: jest.fn(),
      sendStatus: jest.fn(),
    };

    await respond({ method: 'POST' }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
    expect(res.json).not.toHaveBeenCalled();
    expect(res.sendStatus).not.toHaveBeenCalled();
  });

  it('forwards empty responses via sendStatus', async () => {
    const handler = jest.fn().mockResolvedValue({ status: 204 });
    const respond = createHandleReportForModeration(handler);
    const res = {
      status: jest.fn(() => res),
      send: jest.fn(),
      json: jest.fn(),
      sendStatus: jest.fn(),
    };

    await respond({ method: 'POST' }, res);

    expect(res.sendStatus).toHaveBeenCalledWith(204);
    expect(res.json).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('treats null bodies as empty JSON payloads', async () => {
    const handler = jest.fn().mockResolvedValue({
      status: 201,
      body: null,
    });
    const respond = createHandleReportForModeration(handler);
    const res = {
      status: jest.fn(() => res),
      send: jest.fn(),
      json: jest.fn(),
      sendStatus: jest.fn(),
    };

    await respond({ method: 'POST' }, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({});
  });

  it('serializes object responses via json', async () => {
    const handler = jest.fn().mockResolvedValue({
      status: 201,
      body: { ok: true },
    });
    const respond = createHandleReportForModeration(handler);
    const res = {
      status: jest.fn(() => res),
      send: jest.fn(),
      json: jest.fn(),
      sendStatus: jest.fn(),
    };

    await respond({ method: 'POST' }, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('forwards the request body to the domain handler', async () => {
    const body = { variant: ' slug ' };
    const handler = jest.fn().mockResolvedValue({
      status: 201,
      body: { ok: true },
    });
    const respond = createHandleReportForModeration(handler);
    const res = {
      status: jest.fn(() => res),
      send: jest.fn(),
      json: jest.fn(),
      sendStatus: jest.fn(),
    };

    await respond({ method: 'POST', body }, res);

    expect(handler).toHaveBeenCalledWith({ method: 'POST', body });
  });
});
