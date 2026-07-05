import { jest } from '@jest/globals';
import {
  buildReportedErrorEvent,
  createErrorBeaconHandler,
  isErrorBeaconPayload,
} from '../../../../src/core/cloud/errors/errors-core.js';

describe('isErrorBeaconPayload', () => {
  it('accepts JSON objects and rejects primitives', () => {
    expect(isErrorBeaconPayload({ message: 'boom' })).toBe(true);
    expect(isErrorBeaconPayload(null)).toBe(false);
    expect(isErrorBeaconPayload('boom')).toBe(false);
    expect(isErrorBeaconPayload([])).toBe(false);
  });
});

describe('buildReportedErrorEvent', () => {
  it('maps the browser payload into a reported error event', () => {
    const event = buildReportedErrorEvent(
      {
        message: 'boom',
        stack: 'stack',
        url: 'https://example.test/page?token=secret#frag',
        source: 'console.error',
        lineNumber: '42',
        columnNumber: '7',
      },
      't-123',
      () => '2026-07-04T00:00:00.000Z',
      'build-123'
    );

    expect(event).toMatchObject({
      message: 'boom\nstack',
      serviceContext: { service: 't-123-client-js', version: 'build-123' },
      eventTime: '2026-07-04T00:00:00.000Z',
      context: {
        reportLocation: {
          filePath: 'https://example.test/page',
          functionName: 'console.error',
          lineNumber: 42,
          columnNumber: 7,
        },
      },
    });
  });

  it('falls back to browser defaults when fields are blank', () => {
    const event = buildReportedErrorEvent(
      {
        message: '   ',
        stack: '',
        url: '   ',
        source: '   ',
      },
      'prod',
      () => '2026-07-04T00:00:00.000Z',
      ''
    );

    expect(event).toMatchObject({
      message: 'browser error beacon',
      serviceContext: { service: 'prod-client-js' },
      context: {
        reportLocation: {
          filePath: 'browser',
          functionName: 'browser',
        },
      },
    });
  });

  it('omits invalid line and column numbers and tolerates missing build versions', () => {
    const event = buildReportedErrorEvent(
      {
        message: 'boom',
        stack: 'stack',
        url: 'https://example.test/page?token=secret#frag',
        source: 'console.error',
        lineNumber: '0',
        columnNumber: '-1',
      },
      '   ',
      () => '2026-07-04T00:00:00.000Z'
    );

    expect(event).toMatchObject({
      message: 'boom\nstack',
      serviceContext: { service: 'prod-client-js' },
      context: {
        reportLocation: {
          filePath: 'https://example.test/page',
          functionName: 'console.error',
        },
      },
    });
    expect(event.serviceContext).not.toHaveProperty('version');
    expect(event.context.reportLocation).not.toHaveProperty('lineNumber');
    expect(event.context.reportLocation).not.toHaveProperty('columnNumber');
  });
});

describe('createErrorBeaconHandler', () => {
  it('returns 204 after forwarding a valid payload', async () => {
    const reportEvent = jest.fn().mockResolvedValue(undefined);
    const handler = createErrorBeaconHandler({
      environment: 'prod',
      buildVersion: 'build-123',
      reportEvent,
      getServerTimestamp: () => '2026-07-04T00:00:00.000Z',
    });
    const response = createResponse();

    await handler({ method: 'POST', body: { message: 'boom' } }, response.api);

    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent.mock.calls[0][0]).toMatchObject({
      serviceContext: { service: 'prod-client-js', version: 'build-123' },
    });
    expect(response.statusCode).toBe(204);
    expect(response.ended).toBe(true);
  });

  it('rejects non-object payloads', async () => {
    const handler = createErrorBeaconHandler({
      environment: 'prod',
      buildVersion: 'build-123',
      reportEvent: jest.fn(),
      getServerTimestamp: () => '2026-07-04T00:00:00.000Z',
    });
    const response = createResponse();

    await handler({ method: 'POST', body: 'boom' }, response.api);

    expect(response.statusCode).toBe(400);
    expect(response.jsonBody).toEqual({
      error: 'Expected JSON object payload',
    });
  });

  it('reports failures as 500', async () => {
    const handler = createErrorBeaconHandler({
      environment: 'prod',
      buildVersion: 'build-123',
      reportEvent: jest.fn().mockRejectedValue(new Error('fail')),
      getServerTimestamp: () => '2026-07-04T00:00:00.000Z',
    });
    const response = createResponse();

    await handler({ method: 'POST', body: { message: 'boom' } }, response.api);

    expect(response.statusCode).toBe(500);
    expect(response.jsonBody).toEqual({ error: 'fail' });
  });

  it('reports a generic 500 when the rejection is not an Error', async () => {
    const handler = createErrorBeaconHandler({
      environment: 'prod',
      buildVersion: 'build-123',
      reportEvent: jest.fn().mockRejectedValue('boom'),
      getServerTimestamp: () => '2026-07-04T00:00:00.000Z',
    });
    const response = createResponse();

    await handler({ method: 'POST', body: { message: 'boom' } }, response.api);

    expect(response.statusCode).toBe(500);
    expect(response.jsonBody).toEqual({ error: 'Unknown server error' });
  });

  it('reports a generic 500 when the Error message is empty', async () => {
    const error = new Error('');
    const handler = createErrorBeaconHandler({
      environment: 'prod',
      buildVersion: 'build-123',
      reportEvent: jest.fn().mockRejectedValue(error),
      getServerTimestamp: () => '2026-07-04T00:00:00.000Z',
    });
    const response = createResponse();

    await handler({ method: 'POST', body: { message: 'boom' } }, response.api);

    expect(response.statusCode).toBe(500);
    expect(response.jsonBody).toEqual({ error: 'Unknown server error' });
  });

  it('rejects unsupported methods with 405', async () => {
    const handler = createErrorBeaconHandler({
      environment: 'prod',
      buildVersion: 'build-123',
      reportEvent: jest.fn(),
      getServerTimestamp: () => '2026-07-04T00:00:00.000Z',
    });
    const response = createResponse();

    await handler({ method: 'GET', body: { message: 'boom' } }, response.api);

    expect(response.statusCode).toBe(405);
    expect(response.body).toBe('POST only');
  });
});

/**
 * Create a minimal response double for the handler tests.
 * @returns {{ statusCode: number, jsonBody: unknown, ended: boolean, body?: string, api: { status: (code: number) => { json: (body: Record<string, unknown>) => void, send: (body: string) => void, end: () => void } } }} Response double.
 */
function createResponse() {
  const response = {
    statusCode: 0,
    jsonBody: null,
    ended: false,
    api: null,
  };

  response.api = {
    status(code) {
      response.statusCode = code;
      return {
        json(body) {
          response.jsonBody = body;
        },
        send(body) {
          response.body = body;
        },
        end() {
          response.ended = true;
        },
      };
    },
  };

  return response;
}
