import { jest } from '@jest/globals';
import { createLocalServerRuntime } from '../../../src/core/local/run.js';

describe('core local run', () => {
  test('runs server with host and handles permission errors', () => {
    const listen = jest.fn((_port, _host, cb) => cb());
    const on = jest.fn((event, handler) => {
      if (event === 'error') {
        handler({ code: 'EACCES' });
      }
    });
    const runtime = createLocalServerRuntime({
      createLocalApp: jest.fn(() => 'app'),
      createWriterServer: jest.fn(() => ({ listen, on })),
      formatListenErrorMessage: jest.fn(() => 'perm denied'),
      getWriterUrl: jest.fn(() => 'http://example/writer/'),
      isWriterRequestLogEnabled: jest.fn(() => true),
      consoleLog: jest.fn(),
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

    expect(listen).toHaveBeenCalledWith(4321, '0.0.0.0', expect.any(Function));
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });

  test('runs server without host and rethrows unknown errors', () => {
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
});
