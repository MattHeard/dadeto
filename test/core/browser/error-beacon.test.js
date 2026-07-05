import { jest } from '@jest/globals';
import {
  createErrorBeaconHandlers,
  createErrorBeaconReporter,
  normalizeErrorPayload,
} from '../../../src/core/browser/error-beacon.js';
import { sanitizeUrl } from '../../../src/core/error-reporting.js';

describe('normalizeErrorPayload', () => {
  it('returns null for nullish errors', () => {
    expect(
      normalizeErrorPayload({
        error: null,
        source: 'console.error',
        getUrl: () => '',
        getNow: () => 0,
      })
    ).toBeNull();
  });

  it('returns null for undefined errors', () => {
    expect(
      normalizeErrorPayload({
        error: undefined,
        source: 'console.error',
        getUrl: () => '',
        getNow: () => 0,
      })
    ).toBeNull();
  });

  it('serializes plain objects when no error instance exists', () => {
    const payload = normalizeErrorPayload({
      error: { foo: 'bar' },
      source: 'console.error',
      getUrl: () => 'https://example.test/page',
      getNow: () => 1234,
    });

    expect(payload).toMatchObject({
      message: '{"foo":"bar"}',
      stack: '',
      source: 'console.error',
    });
  });

  it('stringifies primitive values', () => {
    const payload = normalizeErrorPayload({
      error: 123,
      source: 'console.error',
      getUrl: () => '',
      getNow: () => 1234,
    });

    expect(payload.message).toBe('123');
  });

  it('falls back to Object.prototype.toString when JSON serialization fails', () => {
    const circular = {};
    circular.self = circular;

    const payload = normalizeErrorPayload({
      error: circular,
      source: 'console.error',
      getUrl: () => '',
      getNow: () => 1234,
    });

    expect(payload.message).toBe('[object Object]');
  });

  it('includes message, stack, URL, and dedupe key', () => {
    const payload = normalizeErrorPayload({
      error: new Error('boom'),
      source: 'console.error',
      getUrl: () => 'https://example.test/page?token=secret#frag',
      getNow: () => 1234,
    });

    expect(payload).toMatchObject({
      message: 'boom',
      url: 'https://example.test/page',
      clientTimestamp: new Date(1234).toISOString(),
      source: 'console.error',
    });
    expect(payload.dedupeKey).toContain('boom\u0000Error: boom');
    expect(payload.dedupeKey).toContain(
      'https://example.test/page?token=secret#frag'
    );
    expect(payload.stack).toContain('Error: boom');
  });

  it('uses the error name when the message is empty', () => {
    const err = new Error();
    err.name = 'CustomError';
    const payload = normalizeErrorPayload({
      error: err,
      source: 'window.error',
      getUrl: () => '',
      getNow: () => 0,
    });

    expect(payload.message).toBe('CustomError');
  });

  it('falls back to the default error name when the name is empty', () => {
    const err = new Error();
    err.name = '';
    const payload = normalizeErrorPayload({
      error: err,
      source: 'window.error',
      getUrl: () => undefined,
      getNow: () => 0,
    });

    expect(payload.message).toBe('Error');
    expect(payload.url).toBe('');
  });

  it('reads a stack from a stack-like object', () => {
    const payload = normalizeErrorPayload({
      error: { stack: 'stack trace', message: 'hi' },
      source: 'window.error',
      getUrl: () => '',
      getNow: () => 0,
    });

    expect(payload.stack).toBe('stack trace');
  });

  it('sanitizes URLs before reporting', () => {
    expect(sanitizeUrl('https://example.com/page.html?token=secret#frag')).toBe(
      'https://example.com/page.html'
    );
    expect(sanitizeUrl('not a url')).toBe('');
  });
});

describe('createErrorBeaconHandlers', () => {
  it('reports console errors once and forwards the original logger call', () => {
    const reportBeacon = jest.fn();
    const logError = jest.fn();
    const handlers = createErrorBeaconHandlers({
      reportBeacon,
      getUrl: () => 'https://example.test/page',
      getNow: () => 1234,
      logError,
    });

    const error = new Error('boom');
    handlers.logError(error);
    handlers.logError(error);

    expect(logError).toHaveBeenCalledWith(error);
    expect(reportBeacon).toHaveBeenCalledTimes(1);
    expect(reportBeacon.mock.calls[0][0]).toMatchObject({
      message: 'boom',
      source: 'console.error',
    });
  });

  it('reports window errors and unhandled rejections', () => {
    const reportBeacon = jest.fn();
    const handlers = createErrorBeaconHandlers({
      reportBeacon,
      getUrl: () => 'https://example.test/page',
      getNow: () => 1234,
    });

    handlers.handleWindowError({
      error: new Error('window boom'),
      message: 'window boom',
    });
    handlers.handleUnhandledRejection({ reason: new Error('reject boom') });

    expect(reportBeacon).toHaveBeenCalledTimes(2);
    expect(reportBeacon.mock.calls[0][0]).toMatchObject({
      source: 'window.error',
      message: 'window boom',
    });
    expect(reportBeacon.mock.calls[1][0]).toMatchObject({
      source: 'unhandledrejection',
      message: 'reject boom',
    });
  });

  it('uses fallback event fields when explicit error fields are absent', () => {
    const reportBeacon = jest.fn();
    const handlers = createErrorBeaconHandlers({
      reportBeacon,
      getUrl: () => 'https://example.test/page',
      getNow: () => 1234,
    });

    handlers.handleWindowError({ message: 'window fallback' });
    handlers.handleUnhandledRejection({ reason: 'reject fallback' });

    expect(reportBeacon).toHaveBeenCalledTimes(2);
    expect(reportBeacon.mock.calls[0][0]).toMatchObject({
      source: 'window.error',
      message: 'window fallback',
    });
    expect(reportBeacon.mock.calls[1][0]).toMatchObject({
      source: 'unhandledrejection',
      message: 'reject fallback',
    });
  });

  it('falls back to the raw event object when no detail fields are present', () => {
    const reportBeacon = jest.fn();
    const handlers = createErrorBeaconHandlers({
      reportBeacon,
      getUrl: () => 'https://example.test/page',
      getNow: () => 1234,
    });

    handlers.handleWindowError({ fallback: 'window' });
    handlers.handleUnhandledRejection({ fallback: 'rejection' });

    expect(reportBeacon).toHaveBeenCalledTimes(2);
    expect(reportBeacon.mock.calls[0][0]).toMatchObject({
      source: 'window.error',
      message: '{"fallback":"window"}',
    });
    expect(reportBeacon.mock.calls[1][0]).toMatchObject({
      source: 'unhandledrejection',
      message: '{"fallback":"rejection"}',
    });
  });

  it('passes multiple console arguments through as a payload array', () => {
    const reportBeacon = jest.fn();
    const handlers = createErrorBeaconHandlers({
      reportBeacon,
      getUrl: () => '',
      getNow: () => 0,
      logError: jest.fn(),
    });

    handlers.logError('first', 'second');

    expect(reportBeacon).toHaveBeenCalledTimes(1);
    expect(reportBeacon.mock.calls[0][0].message).toBe('["first","second"]');
  });

  it('drops duplicate payloads after the first report', () => {
    const reportBeacon = jest.fn();
    const handlers = createErrorBeaconHandlers({
      reportBeacon,
      getUrl: () => 'https://example.test/page',
      getNow: () => 1234,
    });
    const error = new Error('dup');

    handlers.handleWindowError({
      error,
      message: 'dup',
    });
    handlers.handleWindowError({
      error,
      message: 'dup',
    });

    expect(reportBeacon).toHaveBeenCalledTimes(1);
  });

  it('ignores undefined console errors', () => {
    const reportBeacon = jest.fn();
    const handlers = createErrorBeaconHandlers({
      reportBeacon,
      getUrl: () => '',
      getNow: () => 0,
    });

    handlers.logError(undefined);

    expect(reportBeacon).not.toHaveBeenCalled();
  });
});

describe('createErrorBeaconReporter', () => {
  it('no-ops when fetch is unavailable', () => {
    const reporter = createErrorBeaconReporter(undefined, '/errors');
    expect(() => reporter({ message: 'boom' })).not.toThrow();
  });

  it('posts JSON with credentials omitted when fetch exists', async () => {
    const fetchFn = jest.fn(() => Promise.resolve({ ok: true }));
    const reporter = createErrorBeaconReporter(fetchFn, '/errors');

    reporter({ message: 'boom' });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe('/errors');
    expect(fetchFn.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      keepalive: true,
    });
    expect(fetchFn.mock.calls[0][1].headers).toMatchObject({
      'Content-Type': 'application/json',
    });
    expect(fetchFn.mock.calls[0][1].body).toBe(
      JSON.stringify({ message: 'boom' })
    );
  });
});
