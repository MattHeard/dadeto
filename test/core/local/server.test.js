import { jest } from '@jest/globals';
import {
  createLocalAppCore,
  getWriterUrl,
  isWriterHttpsEnabled,
  isWriterRequestLogEnabled,
  shouldSetResponseLocation,
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

  test('decides whether response locations should be set', () => {
    expect(shouldSetResponseLocation('/foo')).toBe(true);
    expect(shouldSetResponseLocation('')).toBe(false);
  });
});
