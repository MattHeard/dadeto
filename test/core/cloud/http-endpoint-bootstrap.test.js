import { jest } from '@jest/globals';
import { createCloudHttpEndpoint } from '../../../src/core/cloud/http-endpoint-bootstrap.js';

describe('createCloudHttpEndpoint', () => {
  it('constructs an app, installs supplied middleware, attaches the supplied route, and registers it', () => {
    const app = { use: jest.fn(), post: jest.fn() };
    const express = jest.fn(() => app);
    const onRequest = jest.fn(value => ({ app: value }));
    const region = jest.fn(() => ({ https: { onRequest } }));
    const handler = jest.fn();

    const result = createCloudHttpEndpoint({
      express,
      middleware: ['cors', 'json'],
      route: { method: 'post', path: '/', handler },
      functions: { region },
    });

    expect(express).toHaveBeenCalledWith();
    expect(app.use).toHaveBeenNthCalledWith(1, 'cors');
    expect(app.use).toHaveBeenNthCalledWith(2, 'json');
    expect(app.post).toHaveBeenCalledWith('/', handler);
    expect(region).toHaveBeenCalledWith('europe-west1');
    expect(onRequest).toHaveBeenCalledWith(app);
    expect(result).toEqual({ app, handle: { app } });
  });

  it('uses an endpoint-supplied region', () => {
    const app = { use: jest.fn(), get: jest.fn() };
    const region = jest.fn(() => ({ https: { onRequest: jest.fn() } }));

    createCloudHttpEndpoint({
      express: () => app,
      middleware: [],
      route: { method: 'get', path: '/health', handler: jest.fn() },
      functions: { region },
      region: 'us-central1',
    });

    expect(region).toHaveBeenCalledWith('us-central1');
    expect(app.get).toHaveBeenCalledWith('/health', expect.any(Function));
  });
});
