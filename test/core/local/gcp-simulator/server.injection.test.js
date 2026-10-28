import { jest } from '@jest/globals';
import { createSimulatorServer } from '../../../../src/core/local/gcp-simulator/server.js';
import { createAllowEffects } from '../../../../src/cloud/allow-effects.js';

/**
 * Compose a server without a socket, native paths or a real simulator.
 * @param {number} port Fake configured port.
 * @returns {object} Captured platform and startup capabilities.
 */
function fixture(port = 42) {
  const listener = { address: () => ({ port: port + 1 }) };
  const app = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    listen: jest.fn((_port, ready) => {
      queueMicrotask(ready);
      return listener;
    }),
  };
  const express = Object.assign(
    jest.fn(() => app),
    {
      json: () => 'json',
      urlencoded: () => 'urlencoded',
      static: jest.fn(value => `static:${value}`),
    }
  );
  const simulator = {
    routes: {},
    storageRoot: 'storage',
    bucketName: 'bucket',
    publicDir: 'served-public',
    getConfig: () => ({}),
    getSeedManifest: () => ({}),
  };
  const permissions = [];
  const createSimulator = jest.fn(async () => simulator);
  const log = jest.fn();
  const deps = {
    express,
    createSimulator,
    log,
    bindStartupEffectBoundary: callback => {
      const permission = createAllowEffects();
      permissions.push(permission);
      return callback(permission);
    },
    useMiddleware: (_permission, target, middleware) => target.use(middleware),
  };
  const join = jest.fn((...parts) => parts.join('|'));
  const isBinary = jest.fn(() => false);
  const server = createSimulatorServer({
    join,
    port,
    publicDir: 'virtual-public',
    isBinary,
  });
  return {
    server,
    app,
    express,
    simulator,
    permissions,
    createSimulator,
    log,
    deps,
    join,
    isBinary,
    listener,
  };
}

test('composes lazily and forwards exact platform configuration and startup permission', async () => {
  const f = fixture();
  expect(Object.keys(f.server).sort()).toEqual(['handle', 'sendRouteResponse']);
  expect(f.createSimulator).not.toHaveBeenCalled();
  expect(f.express).not.toHaveBeenCalled();
  expect(await f.server.handle(f.deps)).toBe(f.listener);
  expect(f.createSimulator.mock.calls).toEqual([
    [
      f.permissions[0],
      { baseUrl: 'http://127.0.0.1:42', publicDir: 'virtual-public' },
    ],
  ]);
  expect(f.join.mock.calls).toEqual([['storage', 'bucket']]);
  expect(f.express.static.mock.calls).toEqual([
    ['storage|bucket'],
    ['served-public'],
  ]);
  expect(f.app.listen).toHaveBeenCalledWith(42, expect.any(Function));
  expect(f.log.mock.calls).toEqual([
    [f.permissions[0], 'gcp simulator listening on http://127.0.0.1:43'],
  ]);
});

test('reuses one factory cache, isolates another factory, and bypasses construction for explicit simulators', async () => {
  const first = fixture(10);
  const second = fixture(20);
  await first.server.handle(first.deps);
  await first.server.handle(first.deps);
  await second.server.handle(second.deps);
  expect(first.createSimulator).toHaveBeenCalledTimes(1);
  expect(second.createSimulator.mock.calls).toEqual([
    [
      second.permissions[0],
      { baseUrl: 'http://127.0.0.1:20', publicDir: 'virtual-public' },
    ],
  ]);
  expect(first.log.mock.calls[0][0]).not.toBe(first.log.mock.calls[1][0]);
  const supplied = fixture();
  await supplied.server.handle({
    ...supplied.deps,
    simulator: Promise.resolve(supplied.simulator),
  });
  expect(supplied.createSimulator).not.toHaveBeenCalled();
});

test('startup boundary rejection prevents construction and app creation', async () => {
  const f = fixture();
  const failure = new Error('startup refused');
  await expect(
    f.server.handle({
      ...f.deps,
      bindStartupEffectBoundary: () => {
        throw failure;
      },
    })
  ).rejects.toBe(failure);
  expect(f.createSimulator).not.toHaveBeenCalled();
  expect(f.express).not.toHaveBeenCalled();
});

test('constructor failure is propagated and cached without creating an app', async () => {
  const f = fixture();
  const failure = new Error('simulator unavailable');
  f.createSimulator.mockRejectedValue(failure);
  await expect(f.server.handle(f.deps)).rejects.toBe(failure);
  await expect(f.server.handle(f.deps)).rejects.toBe(failure);
  expect(f.createSimulator).toHaveBeenCalledTimes(1);
  expect(f.express).not.toHaveBeenCalled();
  expect(f.log).not.toHaveBeenCalled();
});

test('listener failures reject startup without logging readiness', async () => {
  const f = fixture();
  const failure = new Error('listener unavailable');
  f.app.listen.mockImplementation(() => {
    throw failure;
  });
  await expect(f.server.handle(f.deps)).rejects.toBe(failure);
  expect(f.log).not.toHaveBeenCalled();
});

test('recognizes error bytes through its injected predicate and preserves response channels', async () => {
  const f = fixture();
  const response = {
    status: jest.fn(() => response),
    send: jest.fn(),
    json: jest.fn(),
    end: jest.fn(),
  };
  const bytes = { opaque: 'platform-bytes' };
  f.isBinary.mockReturnValue(true);
  await f.server.sendRouteResponse(
    Promise.resolve({ status: 409, body: bytes }),
    response
  );
  expect(f.isBinary.mock.calls).toEqual([[bytes]]);
  expect(response.status.mock.calls).toEqual([[409]]);
  expect(response.send.mock.calls).toEqual([[bytes]]);
  expect(response.json).not.toHaveBeenCalled();
  f.isBinary.mockReturnValue(false);
  await f.server.sendRouteResponse(
    Promise.resolve({ status: 401, body: { error: 'no' } }),
    response
  );
  expect(response.json).toHaveBeenCalledWith({ error: 'no' });
  await f.server.sendRouteResponse(
    Promise.resolve({ status: 400, body: 'bad' }),
    response
  );
  expect(response.send).toHaveBeenCalledWith('bad');
  await f.server.sendRouteResponse(Promise.resolve({ status: 0 }), response);
  expect(response.status).toHaveBeenLastCalledWith(200);
  expect(response.end).toHaveBeenCalledTimes(1);
});

/**
 * Capture each response channel without Express.
 * @returns {object} Chainable response.
 */
function response() {
  const value = {
    status: jest.fn(() => value),
    type: jest.fn(() => value),
    send: jest.fn(),
    json: jest.fn(),
    end: jest.fn(),
    redirect: jest.fn(),
    set: jest.fn(),
  };
  return value;
}

const routeContracts = [
  ['post', '/__sim/submit-new-story', 'submitNewStory', true],
  ['post', '/__sim/submit-new-page', 'submitNewPage', true],
  ['get', '/api-keys/:uuid/credit', 'getApiKeyCreditV2', false],
  ['get', '/api-keys/:uuid/credit/events', 'getApiKeyCreditV2', false],
  ['post', '/api-keys/:uuid/credit', 'getApiKeyCreditV2', true],
  ['get', '/__sim/get-author-uuid-v2', 'getAuthorUuid', false],
  ['get', '/__sim/get-moderation-variant', 'getModerationVariant', false],
  ['post', '/__sim/assign-moderation-job', 'assignModerationJob', true],
  ['post', '/__sim/submit-moderation-rating', 'submitModerationRating', true],
  ['post', '/__sim/trigger-render-contents', 'triggerRenderContents', false],
  ['post', '/__sim/mark-variant-dirty', 'markVariantDirty', true],
  ['post', '/__sim/generate-stats', 'generateStats', false],
  ['post', '/__sim/payment-webhook', 'paymentWebhook', true],
  [
    'post',
    '/__sim/object-minute-rental-search',
    'objectMinuteRentalSearch',
    true,
  ],
];

test('registers the exact route/method catalog and forwards only each declared request body', async () => {
  const f = fixture();
  for (const [, , name] of routeContracts)
    f.simulator.routes[name] = jest.fn(async () => ({
      status: 201,
      body: { handled: name },
    }));
  await f.server.handle(f.deps);
  expect(f.app.get.mock.calls.map(([path]) => path)).toEqual([
    '/healthz',
    '/config.json',
    '/seed.json',
    '/new-story.html',
    ...routeContracts
      .filter(([method]) => method === 'get')
      .map(([, path]) => path),
  ]);
  expect(f.app.post.mock.calls.map(([path]) => path)).toEqual(
    routeContracts
      .filter(([method]) => method === 'post')
      .map(([, path]) => path)
  );
  for (const [method, path, name, includeBody] of routeContracts) {
    const request = {
      method: 'PATCH',
      path: '/incoming',
      body: { raw: true },
      headers: { accept: 'application/json' },
      get: jest.fn(value => `header:${value}`),
    };
    const res = response();
    const callback = f.app[method].mock.calls.find(
      ([registered]) => registered === path
    )[1];
    await callback(request, res);
    const actual = f.simulator.routes[name].mock.calls.at(-1)[0];
    expect(actual).toEqual({
      method: 'PATCH',
      path: '/incoming',
      headers: request.headers,
      get: expect.any(Function),
      ...(includeBody ? { body: request.body } : {}),
    });
    expect(actual.headers).toBe(request.headers);
    expect(actual.get('custom')).toBe('header:custom');
    expect(request.get).toHaveBeenCalledWith('custom');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ handled: name });
    expect(res.redirect).not.toHaveBeenCalled();
  }
});

test('serves health, config, seed and the configured HTML form', async () => {
  const f = fixture();
  const config = { submitNewStoryUrl: '/specific-story' };
  const seed = { version: 'seed-data' };
  f.simulator.getConfig = jest.fn(() => config);
  f.simulator.getSeedManifest = jest.fn(() => seed);
  await f.server.handle(f.deps);
  for (const [path, expected] of [
    ['/healthz', { ok: true }],
    ['/config.json', config],
    ['/seed.json', seed],
  ]) {
    const res = response();
    f.app.get.mock.calls.find(([registered]) => registered === path)[1](
      {},
      res
    );
    expect(res.json.mock.calls).toEqual([[expected]]);
  }
  const res = response();
  f.app.get.mock.calls.find(([path]) => path === '/new-story.html')[1]({}, res);
  expect(res.status.mock.calls).toEqual([[200]]);
  expect(res.type.mock.calls).toEqual([['html']]);
  expect(res.send.mock.calls[0][0]).toContain(
    '<!doctype html><html lang="en">'
  );
  expect(res.send.mock.calls[0][0]).toContain('action="/specific-story"');
  expect(res.send.mock.calls[0][0]).toContain('</main></body></html>');
});

test('redirects only successful HTML story submissions', async () => {
  const f = fixture();
  f.simulator.routes.submitNewStory = jest.fn(async () => ({
    status: 201,
    body: { saved: true },
  }));
  await f.server.handle(f.deps);
  const callback = f.app.post.mock.calls.find(
    ([path]) => path === '/__sim/submit-new-story'
  )[1];
  const request = {
    method: 'POST',
    path: '/incoming',
    headers: {},
    get: () => 'text/html',
  };
  const res = response();
  await callback(request, res);
  expect(res.redirect.mock.calls).toEqual([[303, '/index.html']]);
  expect(res.json).not.toHaveBeenCalled();
  f.simulator.routes.submitNewStory.mockResolvedValue({
    status: 200,
    body: { saved: true },
  });
  const nonCreated = response();
  await callback(request, nonCreated);
  expect(nonCreated.redirect).not.toHaveBeenCalled();
  expect(nonCreated.json).toHaveBeenCalledWith({ saved: true });
});

test('applies exact CORS headers and handles preflight only for the rental-search route', async () => {
  const f = fixture();
  await f.server.handle(f.deps);
  const [cors, preflight] = f.app.use.mock.calls
    .map(([middleware]) => middleware)
    .filter(value => typeof value === 'function');
  const res = response();
  const next = jest.fn();
  cors({}, res, next);
  expect(res.set.mock.calls).toEqual([
    ['Access-Control-Allow-Origin', '*'],
    ['Access-Control-Allow-Methods', 'POST, OPTIONS'],
    ['Access-Control-Allow-Headers', 'Content-Type'],
  ]);
  expect(next).toHaveBeenCalledTimes(1);
  for (const request of [
    { method: 'GET', path: '/other' },
    { method: 'OPTIONS', path: '/other' },
    { method: 'POST', path: '/__sim/object-minute-rental-search' },
  ]) {
    const unrelated = response();
    const proceed = jest.fn();
    preflight(request, unrelated, proceed);
    expect(proceed).toHaveBeenCalledTimes(1);
    expect(unrelated.status).not.toHaveBeenCalled();
  }
  const matched = response();
  const proceed = jest.fn();
  preflight(
    { method: 'OPTIONS', path: '/__sim/object-minute-rental-search' },
    matched,
    proceed
  );
  expect(matched.status.mock.calls).toEqual([[204]]);
  expect(matched.end).toHaveBeenCalledTimes(1);
  expect(proceed).not.toHaveBeenCalled();
});

test.each([null, 'pipe-address'])(
  'reports the configured fallback port for address %j',
  async address => {
    const f = fixture(77);
    f.listener.address = () => address;
    await f.server.handle(f.deps);
    expect(f.log.mock.calls).toEqual([
      [f.permissions[0], 'gcp simulator listening on http://127.0.0.1:77'],
    ]);
  }
);

test('success strings remain JSON while errors with absent bodies are not treated as empty successes', async () => {
  const f = fixture();
  const success = response();
  await f.server.sendRouteResponse(
    Promise.resolve({ status: 200, body: 'success' }),
    success
  );
  expect(success.json.mock.calls).toEqual([['success']]);
  expect(success.send).not.toHaveBeenCalled();
  expect(success.end).not.toHaveBeenCalled();
  const error = response();
  await f.server.sendRouteResponse(Promise.resolve({ status: 418 }), error);
  expect(error.status.mock.calls).toEqual([[418]]);
  expect(error.json.mock.calls).toEqual([[undefined]]);
  expect(error.end).not.toHaveBeenCalled();
});
