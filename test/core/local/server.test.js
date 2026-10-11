import { jest } from '@jest/globals';
import { invokeCapability } from '../../../src/core/capabilities/index.js';
import {
  createLocalAppCore,
  createWriterServer,
  getWriterUrl,
  isWriterHttpsEnabled,
  isWriterRequestLogEnabled,
  shouldSetResponseLocation,
  createRequestLogger,
  getMoveDirection,
  getNextIndex,
  getDocumentContent,
  readWriterTlsOptions,
} from '../../../src/core/local/server.js';

describe('core local server helpers', () => {
  test('wires the local app routes using injected dependencies', async () => {
    const handlers = {};
    const app = {
      use: jest.fn(),
      get: jest.fn((path, handler) => {
        handlers[`get ${path}`] = handler;
      }),
      post: jest.fn((path, handler) => {
        handlers[`post ${path}`] = handler;
      }),
      put: jest.fn((path, handler) => {
        handlers[`put ${path}`] = handler;
      }),
    };
    const deps = {
      app,
      static: prefix => `static:${prefix}`,
      text: options => `text:${options.limit}`,
      json: options => `json:${options.limit}`,
      store: {
        loadWorkflow: jest.fn(async () => ({ ok: true })),
        moveActiveIndex: jest.fn(async () => ({ ok: true })),
        setActiveIndex: jest.fn(async () => ({ ok: true })),
        saveDocument: jest.fn(async () => ({ ok: true })),
      },
      publicDir: '/public',
      writerDir: '/writer',
      exchangeRealtimeCallSdp: jest.fn(async () => ({
        sdpAnswer: 'answer',
        location: '/realtime',
      })),
      getNonCoreThinStatus: jest.fn(() => ({ status: 'ok' })),
      renderNonCoreThinDashboard: jest.fn(() => '<html />'),
      requestLoggerMiddleware: jest.fn(),
      getMoveDirection: jest.fn(() => -1),
      getNextIndex: jest.fn(() => 3),
      getDocumentContent: jest.fn(() => 'content'),
      shouldSetResponseLocation,
    };

    const result = createLocalAppCore(deps);

    expect(result.app).toBe(app);
    expect(app.use).toHaveBeenCalled();
    expect(app.get).toHaveBeenCalledWith(
      '/api/writer/workflow',
      expect.any(Function)
    );
    expect(app.post).toHaveBeenCalledWith(
      '/api/realtime/call',
      expect.any(Function)
    );
    expect(app.put).toHaveBeenCalledWith(
      '/api/writer/document/:documentId',
      expect.any(Function)
    );

    const response = {
      json: jest.fn(),
      type: jest.fn(() => response),
      send: jest.fn(() => response),
      set: jest.fn(),
      status: jest.fn(() => response),
      redirect: jest.fn(),
      headersSent: false,
    };
    const next = jest.fn();

    await handlers['get /api/writer/workflow']({}, response, next);
    await handlers['post /api/writer/workflow/move'](
      { body: { direction: 'left' } },
      response,
      next
    );
    await handlers['post /api/writer/workflow/select'](
      { body: { activeIndex: 3 } },
      response,
      next
    );
    await handlers['put /api/writer/document/:documentId'](
      { params: { documentId: 'thesis' }, body: { content: 'Hello' } },
      response,
      next
    );
    await handlers['post /api/realtime/call'](
      { body: 'offer' },
      response,
      next
    );
    handlers['get /non-core-thin']({}, response, next);
    handlers['get /api/non-core-thin']({}, response, next);
    handlers['get /']({}, response, next);

    expect(deps.store.loadWorkflow).toHaveBeenCalled();
    expect(deps.store.moveActiveIndex).toHaveBeenCalledWith(-1);
    expect(deps.store.setActiveIndex).toHaveBeenCalledWith(3);
    expect(deps.store.saveDocument).toHaveBeenCalledWith('thesis', 'content');
    expect(deps.exchangeRealtimeCallSdp).toHaveBeenCalledWith('offer');
    expect(deps.renderNonCoreThinDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok' })
    );
    expect(deps.getNonCoreThinStatus).toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith('/writer/');
  });
});

describe('core local server routes', () => {
  test('exposes allowlisted capability invocation to loopback callers only', () => {
    const handlers = {};
    const app = {
      use: jest.fn(),
      get: jest.fn((path, handler) => {
        handlers[`get ${path}`] = handler;
      }),
      post: jest.fn((path, handler) => {
        handlers[`post ${path}`] = handler;
      }),
      put: jest.fn((path, handler) => {
        handlers[`put ${path}`] = handler;
      }),
    };
    const deps = {
      app,
      static: prefix => `static:${prefix}`,
      text: options => `text:${options.limit}`,
      json: options => `json:${options.limit}`,
      store: {
        loadWorkflow: jest.fn(async () => ({ ok: true })),
        moveActiveIndex: jest.fn(async () => ({ ok: true })),
        setActiveIndex: jest.fn(async () => ({ ok: true })),
        saveDocument: jest.fn(async () => ({ ok: true })),
      },
      publicDir: '/public',
      writerDir: '/writer',
      exchangeRealtimeCallSdp: jest.fn(async () => ({ sdpAnswer: 'answer' })),
      getNonCoreThinStatus: jest.fn(() => ({ status: 'ok' })),
      renderNonCoreThinDashboard: jest.fn(() => '<html />'),
      getMoveDirection: jest.fn(() => 1),
      getNextIndex: jest.fn(() => 1),
      getDocumentContent: jest.fn(() => ''),
      shouldSetResponseLocation,
      invokeCapability,
    };
    createLocalAppCore(deps);

    const response = {
      status: jest.fn(function status() {
        return this;
      }),
      json: jest.fn(function json() {
        return this;
      }),
    };
    const handler = handlers['post /api/capabilities/:capabilityId/invoke'];

    handler(
      {
        params: { capabilityId: 'JSON1' },
        body: { input: '{"b":2,"a":1}' },
        socket: { remoteAddress: '::1' },
      },
      response
    );
    expect(response.status).toHaveBeenLastCalledWith(200);
    expect(response.json).toHaveBeenLastCalledWith({
      capabilityId: 'JSON1',
      output: '{\n  "a": 1,\n  "b": 2\n}',
    });

    handler(
      {
        params: { capabilityId: 'JSON1' },
        body: { input: '{bad json' },
        socket: { remoteAddress: '127.0.0.1' },
      },
      response
    );
    expect(response.json).toHaveBeenLastCalledWith({
      capabilityId: 'JSON1',
      output: '{"error":"Invalid JSON input: malformed JSON"}',
    });

    handler(
      {
        params: { capabilityId: 'missing' },
        body: { input: '{}' },
        socket: { remoteAddress: '::ffff:127.0.0.1' },
      },
      response
    );
    expect(response.status).toHaveBeenLastCalledWith(404);
    expect(response.json).toHaveBeenLastCalledWith({
      error: 'UNKNOWN_CAPABILITY',
    });

    const invalidInvocationError = new Error('invalid invocation');
    invalidInvocationError.code = 'INVALID_INVOCATION';
    deps.invokeCapability = jest.fn(() => {
      throw invalidInvocationError;
    });
    handler(
      {
        params: { capabilityId: 'JSON1' },
        body: { input: '{}' },
        socket: { remoteAddress: '::1' },
      },
      response
    );
    expect(response.status).toHaveBeenLastCalledWith(400);
    expect(response.json).toHaveBeenLastCalledWith({
      error: 'INVALID_INVOCATION',
    });

    deps.invokeCapability = () => {
      throw new Error('unexpected invocation failure');
    };
    expect(() =>
      handler(
        {
          params: { capabilityId: 'JSON1' },
          body: { input: '{}' },
          socket: { remoteAddress: '::1' },
        },
        response
      )
    ).toThrow('unexpected invocation failure');

    handler(
      {
        params: { capabilityId: 'JSON1' },
        body: { input: 4 },
        socket: { remoteAddress: '::1' },
      },
      response
    );
    expect(response.status).toHaveBeenLastCalledWith(400);
    expect(response.json).toHaveBeenLastCalledWith({
      error: 'INVALID_REQUEST',
    });

    handler(
      {
        params: { capabilityId: 'JSON1' },
        body: { input: '{}' },
        socket: { remoteAddress: '192.0.2.4' },
      },
      response
    );
    expect(response.status).toHaveBeenLastCalledWith(403);
    expect(response.json).toHaveBeenLastCalledWith({
      error: 'LOCAL_CLIENT_REQUIRED',
    });
  });

  test('serves the static pages and config routes', async () => {
    const handlers = {};
    const app = {
      use: jest.fn(),
      get: jest.fn((path, handler) => {
        handlers[`get ${path}`] = handler;
      }),
      post: jest.fn((path, handler) => {
        handlers[`post ${path}`] = handler;
      }),
      put: jest.fn((path, handler) => {
        handlers[`put ${path}`] = handler;
      }),
    };
    const deps = {
      app,
      static: prefix => `static:${prefix}`,
      text: options => `text:${options.limit}`,
      json: options => `json:${options.limit}`,
      store: {
        loadWorkflow: jest.fn(async () => ({ ok: true })),
        moveActiveIndex: jest.fn(async () => ({ ok: true })),
        setActiveIndex: jest.fn(async () => ({ ok: true })),
        saveDocument: jest.fn(async () => ({ ok: true })),
      },
      publicDir: '/public',
      writerDir: '/writer',
      exchangeRealtimeCallSdp: jest.fn(async () => ({ sdpAnswer: 'answer' })),
      getNonCoreThinStatus: jest.fn(() => ({ status: 'ok' })),
      renderNonCoreThinDashboard: jest.fn(() => '<html />'),
      getMoveDirection: jest.fn(() => 1),
      getNextIndex: jest.fn(() => 1),
      getDocumentContent: jest.fn(() => ''),
      shouldSetResponseLocation,
    };
    const response = {
      json: jest.fn(),
      type: jest.fn(() => response),
      send: jest.fn(() => response),
      set: jest.fn(),
      status: jest.fn(() => response),
      redirect: jest.fn(),
      headersSent: false,
    };

    createLocalAppCore(deps);
    const originalApiBaseUrl = process.env.API_BASE_URL;
    response.json.mockReturnValue(response);
    try {
      process.env.API_BASE_URL = 'https://first.invalid';
      expect(handlers['get /config.json']({}, response)).toBeUndefined();
      const firstConfig = response.json.mock.calls.at(-1)[0];
      process.env.API_BASE_URL = 'https://second.invalid';
      expect(handlers['get /config.json']({}, response)).toBeUndefined();
      const secondConfig = response.json.mock.calls.at(-1)[0];
      expect(firstConfig.submitNewStoryUrl).toBe(
        'https://first.invalid/__sim/submit-new-story'
      );
      expect(secondConfig.submitNewStoryUrl).toBe(
        'https://second.invalid/__sim/submit-new-story'
      );
      expect(secondConfig).not.toBe(firstConfig);
      delete process.env.API_BASE_URL;
      handlers['get /config.json']({}, response);
      expect(response.json.mock.calls.at(-1)[0].submitNewStoryUrl).toBe(
        '/__sim/submit-new-story'
      );
    } finally {
      if (originalApiBaseUrl === undefined) delete process.env.API_BASE_URL;
      else process.env.API_BASE_URL = originalApiBaseUrl;
    }
    expect(handlers['get /seed.json']({}, response)).toBeUndefined();
    const firstSeed = response.json.mock.calls.at(-1)[0];
    firstSeed.story.optionText = 'mutated by consumer';
    handlers['get /seed.json']({}, response);
    const secondSeed = response.json.mock.calls.at(-1)[0];
    expect(secondSeed.story.optionText).toBe('Continue to the second page');
    expect(secondSeed.story).not.toBe(firstSeed.story);
    expect(response.json.mock.contexts.at(-1)).toBe(response);
    await handlers['get /admin.html']({}, response, jest.fn());
    await handlers['get /manual.html']({}, response, jest.fn());
    await handlers['get /mod.html']({}, response, jest.fn());
    await handlers['get /new-page.html']({}, response, jest.fn());
    await handlers['get /new-story.html']({}, response, jest.fn());
    await handlers['get /stats.html']({}, response, jest.fn());

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        submitNewStoryUrl: expect.any(String),
      })
    );
    expect(response.send).toHaveBeenCalled();
    expect(response.type).toHaveBeenCalledWith('html');
  });

  test('wires the local app routes without a request logger and skips location headers when not needed', async () => {
    const handlers = {};
    const app = {
      use: jest.fn(),
      get: jest.fn((path, handler) => {
        handlers[`get ${path}`] = handler;
      }),
      post: jest.fn((path, handler) => {
        handlers[`post ${path}`] = handler;
      }),
      put: jest.fn((path, handler) => {
        handlers[`put ${path}`] = handler;
      }),
    };
    const deps = {
      app,
      static: prefix => `static:${prefix}`,
      text: options => `text:${options.limit}`,
      json: options => `json:${options.limit}`,
      store: {
        loadWorkflow: jest.fn(async () => ({ ok: true })),
        moveActiveIndex: jest.fn(async () => ({ ok: true })),
        setActiveIndex: jest.fn(async () => ({ ok: true })),
        saveDocument: jest.fn(async () => ({ ok: true })),
      },
      publicDir: '/public',
      writerDir: '/writer',
      exchangeRealtimeCallSdp: jest.fn(async () => ({
        sdpAnswer: 'answer',
      })),
      getNonCoreThinStatus: jest.fn(() => ({ status: 'ok' })),
      renderNonCoreThinDashboard: jest.fn(() => '<html />'),
      getMoveDirection: jest.fn(() => 1),
      getNextIndex: jest.fn(() => 1),
      getDocumentContent: jest.fn(() => ''),
      shouldSetResponseLocation: jest.fn(() => false),
    };
    const response = {
      json: jest.fn(),
      type: jest.fn(() => response),
      send: jest.fn(() => response),
      set: jest.fn(),
      status: jest.fn(() => response),
      redirect: jest.fn(),
      headersSent: false,
    };

    createLocalAppCore(deps);
    await handlers['post /api/realtime/call']({}, response, jest.fn());

    expect(app.use).not.toHaveBeenCalledWith(expect.any(Function));
    expect(response.set).not.toHaveBeenCalled();
  });
});

describe('core local server writer helpers', () => {
  test('accepts an absent environment object for HTTP server creation', () => {
    const app = {};
    const server = {};
    expect(
      createWriterServer(app, {
        env: undefined,
        readFileSync: jest.fn(),
        httpCreateServer: jest.fn(() => server),
        httpsCreateServer: jest.fn(),
      })
    ).toBe(server);
  });
  test('creates an http writer server by default', () => {
    const app = {};
    const server = {};
    const httpCreateServer = jest.fn(() => server);
    const httpsCreateServer = jest.fn();

    expect(
      createWriterServer(app, {
        env: {},
        readFileSync: jest.fn(),
        httpCreateServer,
        httpsCreateServer,
      })
    ).toBe(server);
    expect(httpCreateServer).toHaveBeenCalledWith(app);
    expect(httpsCreateServer).not.toHaveBeenCalled();
  });

  test('reads HTTPS options from an environment with no prototype', () => {
    const app = {};
    const server = {};
    const readFileSync = jest.fn(path => `${path} contents`);
    expect(
      createWriterServer(app, {
        env: Object.assign(Object.create(null), {
          WRITER_HTTPS: 'true',
          WRITER_TLS_KEY: 'key',
          WRITER_TLS_CERT: 'cert',
        }),
        readFileSync,
        httpCreateServer: jest.fn(),
        httpsCreateServer: jest.fn(() => server),
      })
    ).toBe(server);
  });

  test('requires injected writer server constructors', () => {
    expect(() => createWriterServer({})).toThrow();
  });

  test('creates an https writer server when enabled', () => {
    const app = {};
    const server = {};
    const env = {
      WRITER_HTTPS: 'true',
      WRITER_TLS_KEY: 'key.pem',
      WRITER_TLS_CERT: 'cert.pem',
    };
    const httpCreateServer = jest.fn();
    const httpsCreateServer = jest.fn(() => server);
    const readFileSync = jest.fn(path => `${path} contents`);

    expect(
      createWriterServer(app, {
        env,
        readFileSync,
        httpCreateServer,
        httpsCreateServer,
      })
    ).toBe(server);
    expect(httpsCreateServer).toHaveBeenCalledWith(
      {
        key: 'key.pem contents',
        cert: 'cert.pem contents',
      },
      app
    );
    expect(httpCreateServer).not.toHaveBeenCalled();
  });

  test('reads feature flags and startup URL from injected env', () => {
    const env = {
      WRITER_HTTPS: 'yes',
      WRITER_REQUEST_LOG: 'on',
    };

    expect(isWriterHttpsEnabled(env)).toBe(true);
    expect(isWriterRequestLogEnabled(env)).toBe(true);
    expect(getWriterUrl(4321, env)).toBe('https://localhost:4321/writer/');
  });

  test('falls back to http when the https flag is not enabled', () => {
    expect(isWriterHttpsEnabled({ WRITER_HTTPS: 'nope' })).toBe(false);
    expect(getWriterUrl(4321, { WRITER_HTTPS: 'nope' })).toBe(
      'http://localhost:4321/writer/'
    );
  });

  test('treats missing env as disabled flags and http startup', () => {
    expect(isWriterHttpsEnabled()).toBe(false);
    expect(isWriterRequestLogEnabled()).toBe(false);
    expect(getWriterUrl(4321)).toBe('http://localhost:4321/writer/');
  });

  test('decides whether response locations should be set', () => {
    expect(shouldSetResponseLocation('/foo')).toBe(true);
    expect(shouldSetResponseLocation('')).toBe(false);
  });

  test('covers request logging and helper fallbacks', () => {
    const clock = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(125);
    const requestLogger = jest.fn();
    const middleware = createRequestLogger(requestLogger);
    const finish = jest.fn();
    const req = { method: 'GET', url: '/fallback', socket: {} };
    const res = {
      statusCode: 204,
      on: jest.fn((event, handler) => finish.mockImplementation(handler)),
    };
    const next = jest.fn();

    middleware(req, res, next);
    finish();
    clock.mockRestore();

    expect(next).toHaveBeenCalled();
    expect(requestLogger).toHaveBeenCalledWith(
      'writer request GET /fallback 204 25ms unknown-remote'
    );
    expect(getMoveDirection({})).toBe(1);
    expect(getMoveDirection(null)).toBe(1);
    expect(getMoveDirection({ direction: 'left' })).toBe(-1);
    expect(getNextIndex({ activeIndex: 2 })).toBe(2);
    expect(getNextIndex({ activeIndex: '2' })).toBe(1);
    expect(getDocumentContent({ content: 'text' })).toBe('text');
    expect(getDocumentContent({ content: 2 })).toBe('');
  });

  test('rejects missing TLS paths when HTTPS is enabled', () => {
    expect(() => readWriterTlsOptions({}, jest.fn())).toThrow(
      'WRITER_TLS_KEY is required when WRITER_HTTPS is enabled.'
    );
  });
});
