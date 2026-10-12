import { jest } from '@jest/globals';
import {
  computeModerationUrgency,
  createCorsOptions,
  createCorsOriginValidator,
  createHandleReportForModeration,
  createReportForModerationHandler,
} from '../../../../src/core/cloud/report-for-moderation/report-for-moderation-core.js';

const allowEffects = Object.freeze({ allowed: true });

describe('createReportForModerationHandler', () => {
  it('resolves both identities before rejecting the variant without touching storage', async () => {
    const reads = [];
    const addModerationReport = jest.fn();
    const getServerTimestamp = jest.fn();
    const hasModerationReport = jest.fn();
    const handler = createReportForModerationHandler({
      addModerationReport,
      getServerTimestamp,
      hasModerationReport,
    });
    const body = {
      get variant() {
        reads.push('variant');
        return '';
      },
      get reporterIdentity() {
        reads.push('reporter');
        return 'reader';
      },
    };
    await expect(
      handler(allowEffects, { method: 'POST', body })
    ).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid variant',
    });
    expect(reads).toEqual(['variant', 'reporter']);
    expect(addModerationReport).not.toHaveBeenCalled();
    expect(getServerTimestamp).not.toHaveBeenCalled();
    expect(hasModerationReport).not.toHaveBeenCalled();
  });

  it('creates a moderation report when the request is valid', async () => {
    const addModerationReport = jest.fn().mockResolvedValue(undefined);
    const getServerTimestamp = jest.fn().mockReturnValue('timestamp');
    const handler = createReportForModerationHandler({
      addModerationReport,
      getServerTimestamp,
    });

    const response = await handler(allowEffects, {
      method: 'POST',
      body: { variant: ' slug-value ', reporterIdentity: ' anon-1 ' },
    });

    expect(addModerationReport).toHaveBeenCalledWith(allowEffects, {
      variant: 'slug-value',
      reporterIdentity: 'anon-1',
      createdAt: 'timestamp',
    });
    expect(response).toEqual({ status: 201, body: {} });
  });

  it('throws when addModerationReport is not a function', () => {
    expect(() =>
      createReportForModerationHandler({
        addModerationReport: null,
        getServerTimestamp: () => 'timestamp',
      })
    ).toThrow(new TypeError('addModerationReport must be a function'));
  });

  it('throws when getServerTimestamp is not a function', () => {
    expect(() =>
      createReportForModerationHandler({
        addModerationReport: () => {},
        getServerTimestamp: undefined,
      })
    ).toThrow(new TypeError('getServerTimestamp must be a function'));
  });

  it('returns 400 when variant is missing or blank', async () => {
    const addModerationReport = jest.fn();
    const getServerTimestamp = jest.fn();
    const handler = createReportForModerationHandler({
      addModerationReport,
      getServerTimestamp,
    });

    await expect(
      handler(allowEffects, {
        method: 'POST',
      })
    ).resolves.toEqual({ status: 400, body: 'Missing or invalid variant' });

    await expect(
      handler(allowEffects, {
        method: 'POST',
        body: {},
      })
    ).resolves.toEqual({ status: 400, body: 'Missing or invalid variant' });

    await expect(
      handler(allowEffects, {
        method: 'POST',
        body: { variant: '   ' },
      })
    ).resolves.toEqual({ status: 400, body: 'Missing or invalid variant' });

    expect(addModerationReport).not.toHaveBeenCalled();
  });

  it('supports reporter fallbacks, duplicate reports, and invalid methods', async () => {
    const addModerationReport = jest.fn();
    const handler = createReportForModerationHandler({
      addModerationReport,
      getServerTimestamp: () => 'time',
      hasModerationReport: jest.fn().mockResolvedValue(false),
    });
    await expect(
      handler(allowEffects, {
        method: 'POST',
        body: {
          variant: 'v',
          reporterId: ' reporter ',
        },
      })
    ).resolves.toEqual({ status: 201, body: {} });
    await expect(
      handler(allowEffects, {
        method: 'POST',
        body: {
          variant: 'v',
          anonymousReporterId: ' anon ',
        },
      })
    ).resolves.toEqual({ status: 201, body: {} });

    const duplicate = createReportForModerationHandler({
      addModerationReport,
      getServerTimestamp: () => 'time',
      hasModerationReport: async () => true,
    });
    await expect(
      duplicate(allowEffects, {
        method: 'POST',
        body: {
          variant: 'v',
          reporterIdentity: 'id',
        },
      })
    ).resolves.toEqual({ status: 409, body: 'Report already exists' });
    await expect(
      handler(allowEffects, { method: 'POST', body: { variant: 'v' } })
    ).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid reporter identity',
    });
    await expect(handler(allowEffects)).resolves.toEqual({
      status: 405,
      body: 'POST only',
    });
    await expect(
      handler(allowEffects, {
        method: 'GET',
        body: {
          variant: 'v',
          reporterIdentity: 'id',
        },
      })
    ).resolves.toEqual({ status: 405, body: 'POST only' });
  });
});

describe('report moderation adapters and urgency', () => {
  it('computes bounded urgency and validates CORS origins', () => {
    expect(
      computeModerationUrgency({
        reportCount: 100,
        reportRecency: 2,
        pageAge: 1,
        timeSinceLastReview: 2,
        visibilityDistanceFromThreshold: 2,
        moderationCount: -10,
      })
    ).toBe(1);
    expect(
      computeModerationUrgency({
        reportCount: NaN,
        reportRecency: NaN,
        pageAge: NaN,
        timeSinceLastReview: NaN,
        visibilityDistanceFromThreshold: NaN,
        moderationCount: NaN,
      })
    ).toBe(0);

    const validator = createCorsOriginValidator(['https://allowed']);
    const callback = jest.fn();
    validator(undefined, callback);
    validator('https://allowed', callback);
    validator('https://other', callback);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(createCorsOriginValidator(null)).toEqual(expect.any(Function));
    expect(
      createCorsOptions({ allowedOrigins: ['a'], methods: ['POST', 'PUT'] })
    ).toMatchObject({ methods: ['POST', 'PUT'] });
    expect(createCorsOptions({ allowedOrigins: ['a'] })).toMatchObject({
      methods: ['POST'],
    });
  });

  it('writes string, JSON, status-only, and method responses', async () => {
    const response = () => ({
      status: jest.fn(function status() {
        return this;
      }),
      send: jest.fn(),
      json: jest.fn(),
      sendStatus: jest.fn(),
    });
    const handler = createHandleReportForModeration(
      async (_permission, request) => {
        if (request.body === 'status') return { status: 204, body: undefined };
        if (request.body === 'json') return { status: 201, body: { ok: true } };
        if (request.body === 'null') return { status: 204, body: null };
        return { status: 400, body: 'bad' };
      },
      jest.fn((_permission, response, status, body) => {
        response.status(status);
        if (typeof body === 'string') response.send(body);
        else if (body === undefined) response.sendStatus(status);
        else response.json(body ?? {});
      })
    );
    const methodResponse = response();
    await handler(allowEffects, { method: 'GET', body: 'bad' }, methodResponse);
    expect(methodResponse.status).toHaveBeenCalledWith(405);
    expect(methodResponse.send).toHaveBeenCalledWith('POST only');
    const stringResponse = response();
    await handler(
      allowEffects,
      { method: 'POST', body: 'bad' },
      stringResponse
    );
    expect(stringResponse.send).toHaveBeenCalledWith('bad');
    const jsonResponse = response();
    await handler(allowEffects, { method: 'POST', body: 'json' }, jsonResponse);
    expect(jsonResponse.json).toHaveBeenCalledWith({ ok: true });
    const statusResponse = response();
    await handler(
      allowEffects,
      { method: 'POST', body: 'status' },
      statusResponse
    );
    expect(statusResponse.sendStatus).toHaveBeenCalledWith(204);
    const nullResponse = response();
    await handler(allowEffects, { method: 'POST', body: 'null' }, nullResponse);
    expect(nullResponse.json).toHaveBeenCalledWith({});
  });
});
