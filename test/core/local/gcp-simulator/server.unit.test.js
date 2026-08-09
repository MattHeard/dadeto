import { jest } from '@jest/globals';
import { handle } from '../../../../src/core/local/gcp-simulator/server.js';

describe('gcp simulator server without a listener', () => {
  test('registers and executes simulator routes with injected dependencies', async () => {
    const routes = new Proxy(
      {
        getApiKeyCreditV2: jest.fn(async () => ({
          status: 200,
          body: { credits: 1 },
        })),
        submitNewStory: jest.fn(async request => {
          request.get('accept');
          return { status: 201, body: {} };
        }),
        submitNewPage: jest.fn(async () => ({ status: 500, body: 'bad' })),
        getAuthorUuid: jest.fn(async () => ({ status: 0 })),
        getModerationVariant: jest.fn(async () => ({ status: 500, body: {} })),
      },
      {
        get(target, name) {
          if (!target[name])
            target[name] = jest.fn(async () => ({ status: 200, body: {} }));
          return target[name];
        },
      }
    );
    const routeHandlers = [];
    const middleware = [];
    const app = {
      use: jest.fn(handler => middleware.push(handler)),
      get: jest.fn((path, handler) =>
        routeHandlers.push({ method: 'get', path, handler })
      ),
      post: jest.fn((path, handler) =>
        routeHandlers.push({ method: 'post', path, handler })
      ),
      listen: jest.fn((_port, callback) => {
        const server = { address: () => ({ port: 4321 }) };
        queueMicrotask(callback);
        return server;
      }),
    };
    const express = Object.assign(
      jest.fn(() => app),
      {
        json: jest.fn(() => 'json'),
        urlencoded: jest.fn(() => 'urlencoded'),
        static: jest.fn(() => 'static'),
      }
    );
    const simulator = {
      routes,
      getConfig: () => ({ submitNewStoryUrl: '/__sim/submit-new-story' }),
      getSeedManifest: () => ({ environment: 'test' }),
      storageRoot: '/tmp/storage',
      bucketName: 'bucket',
      publicDir: '/tmp/public',
    };

    const server = await handle({ express, simulator });
    expect(server.address()).toEqual({ port: 4321 });
    expect(routeHandlers.length).toBeGreaterThan(10);

    const makeResponse = () => {
      const res = {
        status: jest.fn(() => res),
        json: jest.fn(),
        send: jest.fn(),
        end: jest.fn(),
        redirect: jest.fn(),
        type: jest.fn(() => res),
        set: jest.fn(),
      };
      return res;
    };
    const request = {
      method: 'GET',
      path: '/test',
      body: { value: true },
      headers: { accept: 'text/html' },
      get: name => request.headers[name.toLowerCase()],
    };
    for (const fn of middleware.filter(value => typeof value === 'function')) {
      fn(request, makeResponse(), jest.fn());
    }
    for (const route of routeHandlers) {
      await route.handler(request, makeResponse(), jest.fn());
    }
    const submitHandler = routeHandlers.find(
      route => route.path === '/__sim/submit-new-story'
    ).handler;
    await submitHandler(
      { ...request, headers: {}, get: () => undefined },
      makeResponse(),
      jest.fn()
    );
    expect(routes.getApiKeyCreditV2).toHaveBeenCalled();
    const defaultServer = await handle({ express });
    expect(defaultServer.address()).toEqual({ port: 4321 });
    const reusedServer = await handle({ express });
    expect(reusedServer.address()).toEqual({ port: 4321 });

    app.listen.mockImplementationOnce((_port, callback) => {
      const server = { address: () => null };
      queueMicrotask(callback);
      return server;
    });
    const nullAddressServer = await handle({ express, simulator });
    expect(nullAddressServer.address()).toBeNull();
  });
});
