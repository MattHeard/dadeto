import { jest } from '@jest/globals';
import {
  getDocumentContent,
  createRequestLogger,
  createWriterServer,
  getMoveDirection,
  getNextIndex,
  getWriterUrl,
  isWriterHttpsEnabled,
  isWriterRequestLogEnabled,
  readWriterTlsOptions,
} from '../../src/core/local/server.js';

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

  test('uses built-in server defaults when custom constructors are omitted', () => {
    const app = {};
    const server = createWriterServer(app, { env: {} });

    expect(server).toEqual(
      expect.objectContaining({ listen: expect.any(Function) })
    );
  });

  test('uses built-in server defaults when no options object is provided', () => {
    const app = {};
    const server = createWriterServer(app);

    expect(server).toEqual(
      expect.objectContaining({ listen: expect.any(Function) })
    );
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

  test('falls back to req.url and socket remoteAddress when available', () => {
    const requestLogger = jest.fn();
    const middleware = createRequestLogger(requestLogger);
    const finishHandlers = {};
    const req = {
      method: 'GET',
      url: '/api/non-core-thin',
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = {
      statusCode: 200,
      on: (event, handler) => {
        finishHandlers[event] = handler;
      },
    };

    middleware(req, res, () => {});
    finishHandlers.finish();

    expect(requestLogger).toHaveBeenCalledWith(
      expect.stringMatching(
        /^writer request GET \/api\/non-core-thin 200 \d+ms 127\.0\.0\.1$/
      )
    );
  });

  test('falls back to unknown-remote when no address is present', () => {
    const requestLogger = jest.fn();
    const middleware = createRequestLogger(requestLogger);
    const finishHandlers = {};
    const req = {
      method: 'GET',
      url: '/api/non-core-thin',
    };
    const res = {
      statusCode: 200,
      on: (event, handler) => {
        finishHandlers[event] = handler;
      },
    };

    middleware(req, res, () => {});
    finishHandlers.finish();

    expect(requestLogger).toHaveBeenCalledWith(
      expect.stringMatching(
        /^writer request GET \/api\/non-core-thin 200 \d+ms unknown-remote$/
      )
    );
  });
});

describe('local writer request body helpers', () => {
  test('extracts workflow move direction and index values', () => {
    expect(getMoveDirection({ direction: 'left' })).toBe(-1);
    expect(getMoveDirection({ direction: 'right' })).toBe(1);
    expect(getMoveDirection({})).toBe(1);

    expect(getNextIndex({ activeIndex: 3 })).toBe(3);
    expect(getNextIndex({ activeIndex: 3.5 })).toBe(1);
    expect(getNextIndex({})).toBe(1);
  });

  test('extracts document content as a string', () => {
    expect(getDocumentContent({ content: 'hello' })).toBe('hello');
    expect(getDocumentContent({ content: 123 })).toBe('');
    expect(getDocumentContent({})).toBe('');
  });
});
