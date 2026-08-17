import { jest } from '@jest/globals';
import {
  createLocalServerRuntime,
  getErrorCode,
} from '../../../src/core/local/run.js';

describe('core local run', () => {
  test('runs server with host and handles permission errors', () => {
    const listen = jest.fn((_port, _host, cb) => cb());
    const on = jest.fn((event, handler) => {
      if (event === 'error') {
        handler({ code: 'EACCES' });
      }
    });
    const createLocalApp = jest.fn(() => 'app');
    const createWriterServer = jest.fn(() => ({ listen, on }));
    const log = jest.fn();
    const runtime = createLocalServerRuntime({
      createLocalApp,
      createWriterServer,
      formatListenErrorMessage: jest.fn(() => 'perm denied'),
      getWriterUrl: jest.fn(() => 'http://example/writer/'),
      isWriterRequestLogEnabled: jest.fn(() => true),
      consoleLog: log,
      consoleError: jest.fn(),
    });

    runtime.runLocalServer({
      env: { WRITER_HOST: ' 0.0.0.0 ' },
      port: 4321,
      store: {},
      publicDir: '/public',
      writerDir: '/writer',
      exchangeRealtimeCallSdp: jest.fn(),
      getNonCoreThinStatus: jest.fn(),
      renderNonCoreThinDashboard: jest.fn(),
    });

    expect(createLocalApp).toHaveBeenCalledWith(
      expect.objectContaining({
        store: expect.any(Object),
        publicDir: '/public',
        writerDir: '/writer',
        requestLogger: expect.any(Function),
      })
    );
    expect(createWriterServer).toHaveBeenCalledWith('app', {
      env: { WRITER_HOST: ' 0.0.0.0 ' },
    });
    expect(listen).toHaveBeenCalledWith(4321, '0.0.0.0', expect.any(Function));
    expect(log).toHaveBeenCalledWith(
      'writer server listening on http://example/writer/'
    );
    expect(log).toHaveBeenCalledWith(
      'non-core-thin dashboard: http://0.0.0.0:4321/non-core-thin'
    );
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });

  test('runs server without host and rethrows unknown errors', () => {
    const log = jest.fn();
    const listen = jest.fn((_port, cb) => cb());
    const on = jest.fn((event, handler) => {
      if (event === 'error') {
        expect(() => handler(new Error('boom'))).toThrow('boom');
      }
    });
    const runtime = createLocalServerRuntime({
      createLocalApp: jest.fn(() => 'app'),
      createWriterServer: jest.fn(() => ({ listen, on })),
      formatListenErrorMessage: jest.fn(),
      getWriterUrl: jest.fn(() => 'http://example/writer/'),
      isWriterRequestLogEnabled: jest.fn(() => false),
      consoleLog: log,
      consoleError: jest.fn(),
    });

    runtime.runLocalServer({
      env: {},
      port: 4321,
      store: {},
      publicDir: '/public',
      writerDir: '/writer',
      exchangeRealtimeCallSdp: jest.fn(),
      getNonCoreThinStatus: jest.fn(),
      renderNonCoreThinDashboard: jest.fn(),
    });

    expect(listen).toHaveBeenCalledWith(4321, expect.any(Function));
    expect(log).toHaveBeenCalledWith(
      'non-core-thin dashboard: set WRITER_HOST=0.0.0.0 to reach /non-core-thin from the LAN'
    );
  });

  test('omits the request logger when request logging is disabled', () => {
    const createLocalApp = jest.fn(() => 'app');
    const runtime = createLocalServerRuntime({
      createLocalApp,
      createWriterServer: jest.fn(() => ({
        listen: jest.fn((_port, cb) => cb()),
        on: jest.fn(),
      })),
      formatListenErrorMessage: jest.fn(),
      getWriterUrl: jest.fn(() => 'http://example/writer/'),
      isWriterRequestLogEnabled: jest.fn(() => false),
      consoleLog: jest.fn(),
      consoleError: jest.fn(),
    });

    runtime.runLocalServer({
      env: {},
      port: 4321,
      store: {},
      publicDir: '/public',
      writerDir: '/writer',
      exchangeRealtimeCallSdp: jest.fn(),
      getNonCoreThinStatus: jest.fn(),
      renderNonCoreThinDashboard: jest.fn(),
    });

    expect(createLocalApp.mock.calls[0][0].requestLogger).toBeUndefined();
  });

  test('passes the enabled request logger into the app configuration', () => {
    const requestLog = jest.fn();
    const createLocalApp = jest.fn(() => 'app');
    const listen = jest.fn((_port, cb) => cb());
    const runtime = createLocalServerRuntime({
      createLocalApp,
      createWriterServer: jest.fn(() => ({ listen, on: jest.fn() })),
      formatListenErrorMessage: jest.fn(),
      getWriterUrl: jest.fn(() => 'http://example/writer/'),
      isWriterRequestLogEnabled: jest.fn(() => true),
      consoleLog: requestLog,
      consoleError: jest.fn(),
    });

    runtime.runLocalServer({
      env: {},
      port: 4321,
      store: {},
      publicDir: '/public',
      writerDir: '/writer',
      exchangeRealtimeCallSdp: jest.fn(),
      getNonCoreThinStatus: jest.fn(),
      renderNonCoreThinDashboard: jest.fn(),
    });

    const appConfig = createLocalApp.mock.calls[0][0];
    appConfig.requestLogger('request');
    expect(requestLog).toHaveBeenCalledWith('request');
  });
});

describe('core local run logging and errors', () => {
  test('returns no code for non-object and code-less errors', () => {
    expect(getErrorCode(null)).toBeNull();
    expect(getErrorCode({ message: 'boom' })).toBeNull();
  });

  test('falls back to the built-in console logger when one is not injected', () => {
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    const listen = jest.fn((_port, cb) => cb());
    const on = jest.fn();
    const runtime = createLocalServerRuntime({
      createLocalApp: jest.fn(() => 'app'),
      createWriterServer: jest.fn(() => ({ listen, on })),
      formatListenErrorMessage: jest.fn(),
      getWriterUrl: jest.fn(() => 'http://example/writer/'),
      isWriterRequestLogEnabled: jest.fn(() => false),
    });

    runtime.runLocalServer({
      env: {},
      port: 4321,
      store: {},
      publicDir: '/public',
      writerDir: '/writer',
      exchangeRealtimeCallSdp: jest.fn(),
      getNonCoreThinStatus: jest.fn(),
      renderNonCoreThinDashboard: jest.fn(),
    });

    expect(consoleLog).toHaveBeenCalledWith(
      'writer server listening on http://example/writer/'
    );
    consoleLog.mockRestore();
  });

  test('rethrows non-object listen errors without treating them as permission failures', () => {
    const listen = jest.fn((_port, cb) => cb());
    const on = jest.fn((event, handler) => {
      if (event === 'error') {
        expect(() => handler(null)).toThrow();
      }
    });
    const runtime = createLocalServerRuntime({
      createLocalApp: jest.fn(() => 'app'),
      createWriterServer: jest.fn(() => ({ listen, on })),
      formatListenErrorMessage: jest.fn(),
      getWriterUrl: jest.fn(() => 'http://example/writer/'),
      isWriterRequestLogEnabled: jest.fn(() => false),
      consoleLog: jest.fn(),
      consoleError: jest.fn(),
    });

    runtime.runLocalServer({
      env: {},
      port: 4321,
      store: {},
      publicDir: '/public',
      writerDir: '/writer',
      exchangeRealtimeCallSdp: jest.fn(),
      getNonCoreThinStatus: jest.fn(),
      renderNonCoreThinDashboard: jest.fn(),
    });

    expect(listen).toHaveBeenCalledWith(4321, expect.any(Function));
  });

  test('rethrows permission-style errors when the code is not a string', () => {
    const listen = jest.fn((_port, cb) => cb());
    const on = jest.fn((event, handler) => {
      if (event === 'error') {
        expect(() => handler({ code: 123 })).toThrow();
      }
    });
    const runtime = createLocalServerRuntime({
      createLocalApp: jest.fn(() => 'app'),
      createWriterServer: jest.fn(() => ({ listen, on })),
      formatListenErrorMessage: jest.fn(),
      getWriterUrl: jest.fn(() => 'http://example/writer/'),
      isWriterRequestLogEnabled: jest.fn(() => false),
      consoleLog: jest.fn(),
      consoleError: jest.fn(),
    });

    runtime.runLocalServer({
      env: {},
      port: 4321,
      store: {},
      publicDir: '/public',
      writerDir: '/writer',
      exchangeRealtimeCallSdp: jest.fn(),
      getNonCoreThinStatus: jest.fn(),
      renderNonCoreThinDashboard: jest.fn(),
    });

    expect(listen).toHaveBeenCalledWith(4321, expect.any(Function));
  });

  test('handles EPERM and rejects objects without an error code', () => {
    const listen = jest.fn((_port, cb) => cb());
    const errorLog = jest.fn();
    const on = jest.fn((event, handler) => {
      if (event === 'error') {
        handler({ code: 'EPERM' });
        expect(() => handler({})).toThrow();
      }
    });
    const runtime = createLocalServerRuntime({
      createLocalApp: jest.fn(() => 'app'),
      createWriterServer: jest.fn(() => ({ listen, on })),
      formatListenErrorMessage: jest.fn(() => 'perm denied'),
      getWriterUrl: jest.fn(() => 'http://example/writer/'),
      isWriterRequestLogEnabled: jest.fn(() => false),
      consoleLog: jest.fn(),
      consoleError: errorLog,
    });

    runtime.runLocalServer({
      env: {},
      port: 4321,
      store: {},
      publicDir: '/public',
      writerDir: '/writer',
      exchangeRealtimeCallSdp: jest.fn(),
      getNonCoreThinStatus: jest.fn(),
      renderNonCoreThinDashboard: jest.fn(),
    });

    expect(errorLog).toHaveBeenCalledWith('perm denied');
    process.exitCode = undefined;
  });
});
