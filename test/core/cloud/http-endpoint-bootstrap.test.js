import { jest } from '@jest/globals';
import { createCloudHttpEndpoint } from '../../../src/core/cloud/http-endpoint-bootstrap.js';

describe('createCloudHttpEndpoint', () => {
  it('constructs an app and forwards startup permission to injected effect adapters', () => {
    const allowEffects = {};
    const app = { use: jest.fn(), post: jest.fn() };
    const express = jest.fn(() => app);
    const onRequest = jest.fn(value => ({ app: value }));
    const region = jest.fn(() => ({ https: { onRequest } }));
    const handler = jest.fn();
    const useMiddleware = jest.fn((permission, target, middleware) =>
      target.use(middleware)
    );
    const registerRoute = jest.fn((permission, target, route) =>
      target[route.method](route.path, route.handler)
    );
    const registerEndpoint = jest.fn((permission, functions, target, name) =>
      functions.region(name).https.onRequest(target)
    );

    const result = createCloudHttpEndpoint(allowEffects, {
      express,
      middleware: ['cors', 'json'],
      route: { method: 'post', path: '/', handler },
      functions: { region },
      useMiddleware,
      registerRoute,
      registerEndpoint,
    });

    expect(express).toHaveBeenCalledWith();
    expect(useMiddleware).toHaveBeenNthCalledWith(1, allowEffects, app, 'cors');
    expect(useMiddleware).toHaveBeenNthCalledWith(2, allowEffects, app, 'json');
    expect(registerRoute).toHaveBeenCalledWith(allowEffects, app, {
      method: 'post',
      path: '/',
      handler,
    });
    expect(registerEndpoint).toHaveBeenCalledWith(
      allowEffects,
      { region },
      app,
      'europe-west1'
    );
    expect(app.use).toHaveBeenNthCalledWith(1, 'cors');
    expect(app.use).toHaveBeenNthCalledWith(2, 'json');
    expect(app.post).toHaveBeenCalledWith('/', handler);
    expect(region).toHaveBeenCalledWith('europe-west1');
    expect(onRequest).toHaveBeenCalledWith(app);
    expect(result).toEqual({ app, handle: { app } });
  });

  it('uses an endpoint-supplied region', () => {
    const allowEffects = {};
    const app = { use: jest.fn(), get: jest.fn() };
    const region = jest.fn(() => ({ https: { onRequest: jest.fn() } }));
    const useMiddleware = (permission, target, middleware) =>
      target.use(middleware);
    const registerRoute = (permission, target, route) =>
      target[route.method](route.path, route.handler);
    const registerEndpoint = (permission, functions, target, name) =>
      functions.region(name).https.onRequest(target);

    createCloudHttpEndpoint(allowEffects, {
      express: () => app,
      middleware: [],
      route: { method: 'get', path: '/health', handler: jest.fn() },
      functions: { region },
      region: 'us-central1',
      useMiddleware,
      registerRoute,
      registerEndpoint,
    });

    expect(region).toHaveBeenCalledWith('us-central1');
    expect(app.get).toHaveBeenCalledWith('/health', expect.any(Function));
  });
});
