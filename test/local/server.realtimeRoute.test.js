import { jest } from '@jest/globals';
import {
  createRequestLogger,
  createWriterServer,
  getWriterUrl,
  isWriterHttpsEnabled,
  isWriterRequestLogEnabled,
  readWriterTlsOptions,
} from '../../src/local/server.js';

describe('local writer server transport', () => {
  test('uses HTTP by default', () => {
    const app = {};
    const server = {};
    const httpCreateServer = jest.fn(() => server);
    const httpsCreateServer = jest.fn();

    expect(
      createWriterServer(app, {
        env: {},
        httpCreateServer,
        httpsCreateServer,
      })
    ).toBe(server);
    expect(httpCreateServer).toHaveBeenCalledWith(app);
    expect(httpsCreateServer).not.toHaveBeenCalled();
    expect(getWriterUrl(4321, {})).toBe('http://localhost:4321/writer/');
  });

  test('uses HTTPS when WRITER_HTTPS is enabled', () => {
    const app = {};
    const server = {};
    const env = {
      WRITER_HTTPS: 'true',
      WRITER_TLS_KEY: 'certs/dadeto-key.pem',
      WRITER_TLS_CERT: 'certs/dadeto.pem',
    };
    const readFile = jest.fn(path => `${path} contents`);
    const httpCreateServer = jest.fn();
    const httpsCreateServer = jest.fn(() => server);

    expect(
      createWriterServer(app, {
        env,
        readFile,
        httpCreateServer,
        httpsCreateServer,
      })
    ).toBe(server);
    expect(isWriterHttpsEnabled(env)).toBe(true);
    expect(httpsCreateServer).toHaveBeenCalledWith(
      {
        key: 'certs/dadeto-key.pem contents',
        cert: 'certs/dadeto.pem contents',
      },
      app
    );
    expect(httpCreateServer).not.toHaveBeenCalled();
    expect(getWriterUrl(4321, env)).toBe('https://localhost:4321/writer/');
  });

  test('requires key and certificate paths for HTTPS mode', () => {
    expect(() =>
      readWriterTlsOptions({ WRITER_HTTPS: '1', WRITER_TLS_CERT: 'cert.pem' })
    ).toThrow('WRITER_TLS_KEY is required when WRITER_HTTPS is enabled.');
    expect(() =>
      readWriterTlsOptions({ WRITER_HTTPS: '1', WRITER_TLS_KEY: 'key.pem' })
    ).toThrow('WRITER_TLS_CERT is required when WRITER_HTTPS is enabled.');
  });
});

describe('local writer request logging', () => {
  test('detects request logging flag values', () => {
    expect(isWriterRequestLogEnabled({ WRITER_REQUEST_LOG: '1' })).toBe(true);
    expect(isWriterRequestLogEnabled({ WRITER_REQUEST_LOG: 'off' })).toBe(
      false
    );
  });

  test('logs completed requests when a request logger is configured', () => {
    const requestLogger = jest.fn();
    const middleware = createRequestLogger(requestLogger);
    const finishHandlers = {};
    const req = {
      method: 'POST',
      originalUrl: '/api/realtime/call',
      ip: '192.168.178.134',
    };
    const res = {
      statusCode: 200,
      on: (event, handler) => {
        finishHandlers[event] = handler;
      },
    };
    const next = jest.fn();

    middleware(req, res, next);
    finishHandlers.finish();

    expect(next).toHaveBeenCalledWith();
    expect(requestLogger).toHaveBeenCalledWith(
      expect.stringMatching(
        /^writer request POST \/api\/realtime\/call 200 \d+ms 192\.168\.178\.134$/
      )
    );
  });
});
