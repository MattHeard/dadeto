import { describe, expect, it, jest } from '@jest/globals';
import {
  initializeFirebaseApp,
  registerGetRoute,
  useMiddleware,
} from '../../../src/cloud/get-moderation-variant/startup-effect-adapters.js';
import {
  logError,
  sendHttpResponse,
  sendJsonResponse,
} from '../../../src/cloud/get-moderation-variant/request-effect-adapters.js';

describe('get-moderation-variant effect adapters', () => {
  it('performs startup initialization and Express registration', () => {
    const permission =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ (
        Object.freeze({})
      );
    const initialize = jest.fn();
    const app = {
      use: jest.fn(),
      get: jest.fn(),
    };
    const middleware = jest.fn();
    const handler = jest.fn();

    initializeFirebaseApp(permission, initialize);
    useMiddleware(permission, app, middleware);
    registerGetRoute(permission, app, '/', handler);

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(app.use).toHaveBeenCalledWith(middleware);
    expect(app.get).toHaveBeenCalledWith('/', handler);
  });

  it('performs response and logging operations', () => {
    const permission =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ (
        Object.freeze({})
      );
    const response = {
      status: jest.fn(() => response),
      json: jest.fn(),
      send: jest.fn(),
    };
    const error = new Error('request failed');
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    sendJsonResponse(permission, response, 200, { ok: true });
    sendHttpResponse(permission, response, 500, 'failed');
    logError(permission, error);

    expect(response.status).toHaveBeenNthCalledWith(1, 200);
    expect(response.json).toHaveBeenCalledWith({ ok: true });
    expect(response.status).toHaveBeenNthCalledWith(2, 500);
    expect(response.send).toHaveBeenCalledWith('failed');
    expect(consoleError).toHaveBeenCalledWith(error);
    consoleError.mockRestore();
  });
});
