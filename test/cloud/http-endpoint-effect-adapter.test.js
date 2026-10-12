import { jest } from '@jest/globals';
import { registerHttpEndpoint } from '../../src/cloud/http-endpoint-effect-adapter.js';

describe('registerHttpEndpoint', () => {
  test('registers middleware, route, and HTTPS function under startup permission', () => {
    const permission = {};
    const app = { use: jest.fn(), post: jest.fn() };
    const express = jest.fn(() => app);
    const handler = jest.fn();
    const onRequest = jest.fn(() => 'https-function');
    const functions = { region: jest.fn(() => ({ https: { onRequest } })) };

    const result = registerHttpEndpoint(permission, {
      express,
      middleware: ['cors', 'json'],
      route: { method: 'post', path: '/', handler },
      functions,
    });

    expect(result).toEqual({ app, handle: 'https-function' });
    expect(express).toHaveBeenCalled();
    expect(app.use).toHaveBeenNthCalledWith(1, 'cors');
    expect(app.use).toHaveBeenNthCalledWith(2, 'json');
    expect(app.post).toHaveBeenCalledWith('/', handler);
    expect(functions.region).toHaveBeenCalledWith('europe-west1');
    expect(onRequest).toHaveBeenCalledWith(app);
  });
});
