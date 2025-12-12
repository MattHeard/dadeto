import { jest } from '@jest/globals';
import {
  createReportForModerationHandler,
  createCorsOriginValidator,
  createCorsOptions,
  createHandleReportForModeration,
} from '../../../../src/core/cloud/report-for-moderation/report-for-moderation-core.js';

describe('createReportForModerationHandler', () => {
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

  it('persists the report and returns 201 when variant is valid', async () => {
    const addModerationReport = jest.fn().mockResolvedValue(undefined);
    const getServerTimestamp = jest.fn(() => 'ts');
    const handler = createReportForModerationHandler({
      addModerationReport,
      getServerTimestamp,
    });

    const response = await handler({
      method: 'POST',
      body: { variant: ' slug ' },
    });

    expect(addModerationReport).toHaveBeenCalledWith({
      variant: 'slug',
      createdAt: 'ts',
    });
    expect(response).toEqual({ status: 201, body: {} });
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
});
